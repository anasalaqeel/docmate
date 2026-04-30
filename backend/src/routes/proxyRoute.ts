import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

const proxyRoute = new Hono();

const proxySchema = z.object({
  url: z.url(),
  method: z.string(),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.unknown().optional(),
});

proxyRoute.post("/", zValidator("json", proxySchema), async (c) => {
  const { url, method, headers, body } = c.req.valid("json");

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: ["GET", "HEAD"].includes(method.toUpperCase()) 
        ? undefined 
        : (typeof body === 'string' ? body : JSON.stringify(body)),
    });

    // Try to parse as JSON, fallback to text
    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json") 
      ? await response.json().catch(() => response.text())
      : await response.text();

    return c.json({
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: "Proxy request failed", message: errorMessage }, 500);
  }
});

export default proxyRoute;
