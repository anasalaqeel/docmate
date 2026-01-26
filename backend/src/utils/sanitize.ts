/**
 * Backend sanitization utilities
 */

// Sanitize input values
export function sanitizeInput(
  input: string,
  type: "param" | "search" | "general" = "general"
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
export function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const sanitizedKey = sanitizeInput(key, "param");

    if (typeof value === "string") {
      sanitized[sanitizedKey] = sanitizeInput(value, "general");
    } else if (Array.isArray(value)) {
      // Handle arrays by sanitizing each element
      sanitized[sanitizedKey] = value.map(item => {
        if (typeof item === "string") {
          return sanitizeInput(item, "general");
        } else if (typeof item === "object" && item !== null) {
          return sanitizeObject(item as Record<string, unknown>);
        }
        return item;
      });
    } else if (typeof value === "object" && value !== null) {
      sanitized[sanitizedKey] = sanitizeObject(value as Record<string, unknown>);
    } else {
      sanitized[sanitizedKey] = value;
    }
  }

  return sanitized;
}
