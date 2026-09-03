import { Hono } from "hono";
import type { Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import type { UIMessage } from "ai";
import db from "../db";
import { documentations } from "../db/schema";
import { authorize } from "../middlewares/authorize";
import { aiRateLimit } from "../middlewares/rateLimiter";
import { isAskAiEnabled, streamAskAi, testAiConnection, AskAiError } from "../services/askAiService";
import { registerRoute } from "../utils/openApiGenerator";

const askAiSchema = z.object({
  // Absent when the user asks from the documentation overview page.
  pageId: z.number().int().positive().optional(),
  // UI message stream history sent back by @ai-sdk/react's useChat. Only the
  // fields needed by convertToModelMessages are validated; the rest passes
  // through unchanged.
  messages: z
    .array(
      z.looseObject({
        id: z.string().min(1),
        role: z.enum(["user", "assistant"]),
        parts: z.array(z.looseObject({ type: z.string() })).min(1).max(100),
      })
    )
    .min(1)
    .max(20),
});

type AskAiInput = z.infer<typeof askAiSchema>;

// The validated body is passed in explicitly: reading c.req.valid() with a
// bare Context type resolves validation targets to never.
async function handleAsk(c: Context, docId: number, input: AskAiInput) {
  try {
    if (!(await isAskAiEnabled())) {
      return c.json({ success: false, message: "AI assistant is not enabled" }, 503);
    }

    const result = await streamAskAi({
      docId,
      pageId: input.pageId,
      messages: input.messages as unknown as UIMessage[],
      // Client disconnects abort immediately; the 2-minute cap also ends
      // requests where the provider never answers.
      abortSignal: AbortSignal.any([c.req.raw.signal, AbortSignal.timeout(120_000)]),
    });

    // X-Accel-Buffering disables nginx response buffering so SSE tokens
    // reach the browser immediately.
    return result.toUIMessageStreamResponse({
      headers: {
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
      onError: () => "An error occurred while generating the answer.",
    });
  } catch (error) {
    if (error instanceof AskAiError) {
      return c.json({ success: false, message: error.message }, error.status as 404 | 503);
    }
    console.error("Ask AI request failed:", error);
    return c.json({ success: false, message: "Failed to generate an answer" }, 500);
  }
}

const askAiRoute = new Hono();

// Public entry point: any visitor may ask about a public documentation.
askAiRoute.post(
  "/public/:id/ask",
  aiRateLimit,
  zValidator("json", askAiSchema),
  async (c) => {
    const docId = Number(c.req.param("id"));
    if (!Number.isInteger(docId) || docId <= 0) {
      return c.json({ success: false, message: "Invalid documentation id" }, 400);
    }
    const doc = await db.query.documentations
      .findFirst({ where: and(eq(documentations.id, docId), eq(documentations.isPublic, true)) })
      .catch(() => null);
    if (!doc) {
      return c.json({ success: false, message: "Documentation not found or not public" }, 404);
    }
    return handleAsk(c, docId, c.req.valid("json"));
  }
);

// Authenticated entry point for private documentations (admin editor).
askAiRoute.post(
  "/:id/ask",
  aiRateLimit,
  authorize(["docs:read"]),
  zValidator("json", askAiSchema),
  async (c) => {
    const docId = Number(c.req.param("id"));
    if (!Number.isInteger(docId) || docId <= 0) {
      return c.json({ success: false, message: "Invalid documentation id" }, 400);
    }
    return handleAsk(c, docId, c.req.valid("json"));
  }
);

askAiRoute.get("/ask/status", async (c) => {
  try {
    return c.json({ success: true, data: { enabled: await isAskAiEnabled() } });
  } catch (error) {
    console.error("Error checking Ask AI status:", error);
    return c.json({ success: false, message: "Failed to check AI status" }, 500);
  }
});

// Validates the saved AI configuration (URL, key, model) so admins catch
// problems when saving settings rather than from reader-facing errors.
askAiRoute.post("/ask/test", authorize(["settings:manage"]), async (c) => {
  try {
    const result = await testAiConnection();
    return c.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof AskAiError) {
      return c.json({ success: false, message: error.message }, error.status as 404 | 503);
    }
    console.error("Ask AI connection test failed:", error);
    return c.json({ success: false, message: "Failed to test the AI connection" }, 500);
  }
});

registerRoute("GET", "/docs/ask/status", undefined, {
  tags: ["Ask AI"],
  summary: "Ask AI status",
  description: "Returns whether the Ask AI assistant is enabled for this deployment",
});

registerRoute("POST", "/docs/ask/test", undefined, {
  tags: ["Ask AI"],
  summary: "Test the AI provider connection",
  description: "Probes the configured OpenAI-compatible endpoint (GET /models) and reports whether the configured model exists (requires settings:manage)",
});

registerRoute("POST", "/docs/public/:id/ask", askAiSchema, {
  tags: ["Ask AI"],
  summary: "Ask AI about a public documentation",
  description: "Streams an AI answer about a public documentation page (no auth required)",
});

registerRoute("POST", "/docs/:id/ask", askAiSchema, {
  tags: ["Ask AI"],
  summary: "Ask AI about a documentation",
  description: "Streams an AI answer about a documentation page (requires docs:read)",
});

export default askAiRoute;
