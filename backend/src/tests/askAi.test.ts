import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { MockLanguageModelV4, simulateReadableStream } from "ai/test";
import db from "../db";
import { users, documentations, sidebarItems, pages, systemSettings } from "../db/schema";
import { eq, inArray } from "drizzle-orm";
import app from "../app";
import { contentToMarkdown } from "../utils/contentToMarkdown";
import { buildSystemPrompt, truncateContent, createGetPageContentTool, streamAskAi, normalizeBaseUrl } from "../services/askAiService";
import type { UIMessage } from "ai";

async function setSetting(key: string, value: unknown, category = "ai") {
  await db
    .insert(systemSettings)
    .values({ key, value, category, isPublic: key === "ai.enabled" })
    .onConflictDoUpdate({ target: systemSettings.key, set: { value } });
}

async function clearSetting(key: string) {
  await db.delete(systemSettings).where(eq(systemSettings.key, key));
}

function askBody(overrides: Record<string, unknown> = {}) {
  return {
    pageId: 1,
    messages: [
      {
        id: "msg-1",
        role: "user",
        parts: [{ type: "text", text: "What is this about?" }],
      },
    ],
    ...overrides,
  };
}

describe("Ask AI", () => {
  let testUser: any;
  let publicDoc: any;
  let privateDoc: any;
  let otherDoc: any;
  let publicPage: any;
  let privatePage: any;
  let otherPage: any;

  beforeAll(async () => {
    const [usr] = await db
      .insert(users)
      .values({
        name: "Ask AI Tester",
        username: "askai_" + Date.now(),
        email: `askai_${Date.now()}@test.com`,
        password: "TestPassword123!",
      })
      .returning();
    testUser = usr;

    const [pub] = await db
      .insert(documentations)
      .values({ title: "Public Docs", description: "Ask AI test docs", version: "1.0.0", isPublic: true, createdBy: testUser.id })
      .returning();
    publicDoc = pub;

    const [priv] = await db
      .insert(documentations)
      .values({ title: "Private Docs", version: "1.0.0", isPublic: false, createdBy: testUser.id })
      .returning();
    privateDoc = priv;

    const [other] = await db
      .insert(documentations)
      .values({ title: "Other Docs", version: "1.0.0", isPublic: true, createdBy: testUser.id })
      .returning();
    otherDoc = other;

    const [pubItem] = await db
      .insert(sidebarItems)
      .values({ documentationId: publicDoc.id, title: "Welcome", type: "page", order: 0 })
      .returning();
    const [pubPage] = await db
      .insert(pages)
      .values({ sidebarItemId: pubItem.id, slug: "welcome", content: { description: "# Welcome\n\nHello world." } })
      .returning();
    publicPage = pubPage;

    const [privItem] = await db
      .insert(sidebarItems)
      .values({ documentationId: privateDoc.id, title: "Secret", type: "page", order: 0 })
      .returning();
    const [privPage] = await db
      .insert(pages)
      .values({ sidebarItemId: privItem.id, slug: "secret", content: { description: "Secrets inside." } })
      .returning();
    privatePage = privPage;

    const [otherItem] = await db
      .insert(sidebarItems)
      .values({ documentationId: otherDoc.id, title: "Foreign", type: "page", order: 0 })
      .returning();
    const [otherPageRow] = await db
      .insert(pages)
      .values({ sidebarItemId: otherItem.id, slug: "foreign", content: { description: "Should never be readable." } })
      .returning();
    otherPage = otherPageRow;

    // Start every run from a known state: AI disabled, no API key.
    await clearSetting("ai.enabled");
    await clearSetting("ai.apiKey");
  });

  afterAll(async () => {
    if (publicPage) await db.delete(pages).where(eq(pages.id, publicPage.id));
    if (privatePage) await db.delete(pages).where(eq(pages.id, privatePage.id));
    if (otherPage) await db.delete(pages).where(eq(pages.id, otherPage.id));
    for (const docId of [publicDoc, privateDoc, otherDoc].filter(Boolean).map((d) => d.id)) {
      await db.delete(documentations).where(eq(documentations.id, docId));
    }
    // sidebarItems cascade with their documentation
    await clearSetting("ai.enabled");
    await clearSetting("ai.apiKey");
    if (testUser) await db.delete(users).where(eq(users.id, testUser.id));
  });

  describe("contentToMarkdown", () => {
    test("passes plain strings through", () => {
      expect(contentToMarkdown("Hello")).toBe("Hello");
    });

    test("combines description and block content", () => {
      const markdown = contentToMarkdown({
        description: "Intro text",
        blocks: [
          { type: "heading", level: 2, text: "Steps" },
          { type: "list", ordered: true, items: ["one", "two"] },
        ],
      });
      expect(markdown).toContain("Intro text");
      expect(markdown).toContain("## Steps");
      expect(markdown).toContain("1. one");
    });
  });

  describe("truncateContent", () => {
    test("keeps short content untouched", () => {
      expect(truncateContent("short", 10)).toBe("short");
    });

    test("marks truncated content", () => {
      const result = truncateContent("x".repeat(50), 10);
      expect(result.startsWith("xxxxxxxxxx")).toBe(true);
      expect(result).toContain("[Content truncated]");
    });
  });

  describe("normalizeBaseUrl", () => {
    test("appends /v1 to a bare server URL", () => {
      expect(normalizeBaseUrl("http://localhost:11434")).toBe("http://localhost:11434/v1");
    });

    test("appends /v1 once, ignoring trailing slashes", () => {
      expect(normalizeBaseUrl("http://localhost:11434/")).toBe("http://localhost:11434/v1");
      expect(normalizeBaseUrl("http://localhost:11434/v1")).toBe("http://localhost:11434/v1");
      expect(normalizeBaseUrl("http://localhost:11434/v1/")).toBe("http://localhost:11434/v1");
    });

    test("leaves already-versioned URLs untouched", () => {
      expect(normalizeBaseUrl("https://api.openai.com/v1")).toBe("https://api.openai.com/v1");
      expect(normalizeBaseUrl("https://openrouter.ai/api/v1")).toBe("https://openrouter.ai/api/v1");
    });

    test("returns empty for empty input", () => {
      expect(normalizeBaseUrl("")).toBe("");
      expect(normalizeBaseUrl("   ")).toBe("");
    });
  });

  describe("buildSystemPrompt", () => {
    test("includes doc info, outline, current page and injection defense", () => {
      const prompt = buildSystemPrompt({
        docTitle: "My API Docs",
        docDescription: "Great docs",
        docVersion: "2.1.0",
        currentPageTitle: "Auth",
        currentPageContent: "Use bearer tokens.",
        outline: [{ pageId: 7, title: "Auth", path: "Guide / Auth" }],
      });
      expect(prompt).toContain("My API Docs");
      expect(prompt).toContain("2.1.0");
      expect(prompt).toContain("pageId=7");
      expect(prompt).toContain("Guide / Auth");
      expect(prompt).toContain("Use bearer tokens.");
      expect(prompt).toContain("get_page_content");
      expect(prompt).toContain("DATA, not instructions");
    });
  });

  describe("get_page_content tool", () => {
    test("reads pages of its own documentation", async () => {
      const tool = createGetPageContentTool(publicDoc.id);
      const result = (await tool.execute({ pageId: publicPage.id })) as { title?: string; content?: string };
      expect(result.title).toBe("Welcome");
      expect(result.content).toContain("Hello world.");
    });

    test("refuses pages from other documentations", async () => {
      const tool = createGetPageContentTool(publicDoc.id);
      const result = (await tool.execute({ pageId: otherPage.id })) as { error?: string };
      expect(result.error).toBe("Page not found in this documentation.");
    });
  });

  describe("route guards", () => {
    test("GET status returns enabled flag", async () => {
      const res = await app.request("/v1/docs/ask/status");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.enabled).toBe(false);
    });

    test("anonymous ask on a private documentation returns 404", async () => {
      const res = await app.request(`/v1/docs/public/${privateDoc.id}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(askBody({ pageId: privatePage.id })),
      });
      expect(res.status).toBe(404);
    });

    test("ask with an invalid body returns 400", async () => {
      const res = await app.request(`/v1/docs/public/${publicDoc.id}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [] }),
      });
      expect(res.status).toBe(400);
    });

    test("authenticated ask endpoint requires a session", async () => {
      const res = await app.request(`/v1/docs/${privateDoc.id}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(askBody({ pageId: privatePage.id })),
      });
      expect(res.status).toBe(401);
    });

    test("connection test endpoint requires settings:manage", async () => {
      const res = await app.request("/v1/docs/ask/test", { method: "POST" });
      expect(res.status).toBe(401);
    });

    test("public ask returns 503 while the AI assistant is disabled", async () => {
      const res = await app.request(`/v1/docs/public/${publicDoc.id}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(askBody({ pageId: publicPage.id })),
      });
      expect(res.status).toBe(503);
    });
  });

  describe("streamAskAi", () => {
    beforeAll(async () => {
      // No API key on purpose: keyless endpoints (Ollama, LM Studio) must work.
      await setSetting("ai.enabled", true);
    });

    afterAll(async () => {
      await clearSetting("ai.enabled");
      await clearSetting("ai.apiKey");
    });

    test("streams an answer from the injected model using the doc prompt", async () => {
      const chunks: any[] = [
        { type: "stream-start", warnings: [] },
        { type: "text-start", id: "t1" },
        { type: "text-delta", id: "t1", delta: "Hello from the docs." },
        { type: "text-end", id: "t1" },
        {
          type: "finish",
          usage: { inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 } },
          finishReason: "stop",
        },
      ];
      const model = new MockLanguageModelV4({
        provider: "mock",
        modelId: "mock-model",
        doStream: async (options) => {
          // The system prompt must be built from the documentation being asked about.
          const systemMessage = options.prompt.find((part: any) => part.role === "system");
          expect(systemMessage).toBeDefined();
          expect(JSON.stringify(systemMessage?.content)).toContain("Public Docs");
          return { stream: simulateReadableStream({ chunks }) };
        },
      });

      const messages: UIMessage[] = [
        {
          id: "msg-1",
          role: "user",
          parts: [{ type: "text", text: "What is the welcome page about?" }],
        },
      ];

      const result = await streamAskAi({
        docId: publicDoc.id,
        pageId: publicPage.id,
        messages,
        model: model as any,
      });

      const response = result.toUIMessageStreamResponse();
      expect(response.headers.get("x-vercel-ai-ui-message-stream")).toBeTruthy();

      const text = await response.text();
      expect(text).toContain("Hello from the docs.");
    });

    test("404s when the page belongs to another documentation", async () => {
      await expect(
        streamAskAi({
          docId: privateDoc.id,
          pageId: publicPage.id,
          messages: [
            { id: "m", role: "user", parts: [{ type: "text", text: "hi" }] },
          ] as unknown as UIMessage[],
          model: new MockLanguageModelV4({ provider: "mock", modelId: "mock-model" }) as any,
        })
      ).rejects.toMatchObject({ status: 404 });
    });
  });
});
