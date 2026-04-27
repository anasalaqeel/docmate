import { Context, Next } from "hono";
import type { StatusCode } from "hono/utils/http-status";
import config from "config";

// Simple in-memory rate limiter for uploads
class SimpleRateLimiter {
  private requests = new Map<string, { count: number; resetTime: number }>();

  constructor(private windowMs: number, private maxRequests: number) {}

  isAllowed(key: string): boolean {
    const now = Date.now();
    const windowStart = Math.floor(now / this.windowMs) * this.windowMs;
    const requestData = this.requests.get(key) || { count: 0, resetTime: windowStart };

    if (now - requestData.resetTime >= this.windowMs) {
      // Reset window
      requestData.count = 1;
      requestData.resetTime = now;
    } else {
      requestData.count++;
    }

    return requestData.count <= this.maxRequests;
  }

  cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.windowMs;

    // Convert to array to avoid Map iteration issue
    const entries = Array.from(this.requests.entries());

    for (const [key, data] of entries) {
      if (data.resetTime < cutoff) {
        this.requests.delete(key);
      }
    }
  }
}

// Global rate limiter instance for uploads
const uploadRateLimiter = new SimpleRateLimiter(60 * 1000, 5); // 1 minute, 5 requests

// Rate limiting middleware
export const uploadRateLimit = async (c: Context, next: Next) => {
  const key = c.get('clientIP') || 'unknown';

  if (!uploadRateLimiter.isAllowed(key)) {
    return c.json({
      success: false,
      message: "Too many upload attempts, please try again later"
    }, 429);
  }

  await next();
};

// Upload security middleware
export const uploadSecurityMiddleware = async (c: Context, next: Next) => {
  const contentLength = c.req.header("content-length");
  const contentType = c.req.header("content-type");
  const userAgent = c.req.header("user-agent") || "";

  // Validate content length
  if (contentLength) {
    const size = parseInt(contentLength);
    const maxSize = config.get<number>("uploads.maxSize");
    if (size > maxSize) {
      return c.json({ success: false, message: "Request too large" }, 413);
    }
  }

  // Validate content type
  if (!contentType || !contentType.includes("multipart/form-data")) {
    return c.json({ success: false, message: "Invalid content type for file upload" }, 400);
  }

  // Additional scrutiny for automated tools
  const suspiciousAgents = ["curl", "wget", "python-requests", "postman", "insomnia"];
  const isSuspiciousAgent = suspiciousAgents.some((agent) =>
    userAgent.toLowerCase().includes(agent)
  );

  if (isSuspiciousAgent) {
    // You could add additional verification steps here
    console.warn(`Suspicious upload attempt from: ${userAgent}`);
  }

  // Check for common attack patterns
  const forwardedFor = c.req.header("x-forwarded-for") || "";
  const realIp = c.req.header("x-real-ip") || "";

  // Simple IP-based restrictions (you might want to enhance this)
  const ip = forwardedFor.split(",")[0] || realIp || c.req.header("x-forwarded-for") || "unknown";

  // Add rate limiting key based on IP
  c.set("clientIP", ip);

  await next();
};

// File validation middleware
export const fileValidationMiddleware = async (c: Context, next: Next) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File;
    const uploadType = formData.get("type") as string;

    if (!file || !(file instanceof File)) {
      return c.json({ success: false, message: "No valid file provided" }, 400);
    }

    if (!uploadType) {
      return c.json({ success: false, message: "Upload type is required" }, 400);
    }

    // Store validated data in context for next middleware
    c.set("validatedFile", file);
    c.set("uploadType", uploadType);

    await next();
  } catch (error) {
    return c.json(
      {
        success: false,
        message: "Invalid form data or malformed request",
      },
      400
    );
  }
};

// Error cleanup middleware
export const uploadErrorCleanup = async (c: Context, next: Next) => {
  try {
    await next();
  } catch (error) {
    console.error("Upload error:", error);

    // Clean up any partial uploads or temporary files
    // This would be implemented based on your cleanup strategy

    return c.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Upload failed",
      },
      500
    );
  }
};
