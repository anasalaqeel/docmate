/**
 * Backend sanitization utilities
 */

// Sanitize input values
export function sanitizeInput(
  input: string,
  type: "param" | "search" | "general" = "general",
): string {
  if (!input) return input;

  // Basic sanitization
  let sanitized = input.trim();

  // Remove potentially harmful characters for parameters
  if (type === "param") {
    sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, "");
  }

  // For search, allow more characters but limit special ones
  if (type === "search") {
    sanitized = sanitized.replace(/<[^>]*>?/gm, ""); // Remove HTML tags
  }

  return sanitized;
}

// Sanitize object recursively
export function sanitizeObject<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return (typeof obj === "string" ? sanitizeInput(obj, "general") : obj) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item)) as T;
  }

  const sanitized: any = {};
  const record = obj as Record<string, unknown>;

  for (const [key, value] of Object.entries(record)) {
    const sanitizedKey = sanitizeInput(key, "param");
    sanitized[sanitizedKey] = sanitizeObject(value);
  }

  return sanitized as T;
}
