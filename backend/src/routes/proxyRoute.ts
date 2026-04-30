import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import axios from "axios";

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
    const response = await axios({
      url,
      method: method.toUpperCase(),
      headers: {
        ...headers,
      },
      data: ["GET", "HEAD"].includes(method.toUpperCase()) ? undefined : body,
      validateStatus: () => true, // Don't throw on error status codes
      responseType: 'arraybuffer', // Get raw data to handle any content type
    });

    // Determine if it's JSON or text for the response
    const contentType = (response.headers["content-type"] as string) || "";
    let data: any;
    
    const buffer = Buffer.from(response.data);
    if (contentType.includes("application/json")) {
      try {
        data = JSON.parse(buffer.toString());
      } catch {
        data = buffer.toString();
      }
    } else {
      data = buffer.toString();
    }

    return c.json({
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: "Proxy request failed", message: errorMessage }, 500);
  }
});

export default proxyRoute;
