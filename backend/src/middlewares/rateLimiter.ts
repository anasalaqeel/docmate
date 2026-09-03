import { Context, Next } from 'hono';

const store = new Map<string, { count: number; resetTime: number }>();

// Cleanup expired entries every 10 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of store) {
    if (now > record.resetTime) store.delete(key);
  }
}, 10 * 60 * 1000);

export function createRateLimiter(windowMs: number, requestCount: number, message: string) {
  return async (c: Context, next: Next) => {
    const key = c.req.header('x-forwarded-for') ||
                c.req.header('x-real-ip') ||
                (c.env as { ip?: string } | undefined)?.ip ||
                'unknown';

    const now = Date.now();
    const record = store.get(key);

    if (!record || now > record.resetTime) {
      // First request or window expired
      store.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      await next();
      return;
    }

    if (record.count >= requestCount) {
      return c.json({
        success: false,
        message
      }, 429);
    }

    record.count++;
    await next();
  };
}

// Rate limiting configurations
export const authRateLimit = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // Limit each IP to 5 requests per windowMs
  'Too many requests from this IP, please try again after 15 minutes'
);

export const generalRateLimit = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // Limit each IP to 100 requests per windowMs
  'Too many requests from this IP, please try again after 15 minutes'
);

export const strictRateLimit = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  3, // Limit each IP to 3 requests per hour
  'Too many sensitive requests from this IP, please try again after an hour'
);

// For SAML endpoints: not brute-forceable (signature-verified assertions,
// server-generated redirects), so this only blunts DoS while leaving ample
// headroom for NAT-shared offices. Each SSO login uses 2 requests
// (redirect + IdP callback).
export const samlRateLimit = createRateLimiter(
  5 * 60 * 1000, // 5 minutes
  30, // Limit each IP to 30 requests per windowMs (~15 SSO logins)
  'Too many SAML requests from this IP, please try again after 5 minutes'
);

// AI endpoints call a paid external provider per request, so keep a tighter
// ceiling than general API traffic while still allowing a Q&A conversation.
export const aiRateLimit = createRateLimiter(
  60 * 1000, // 1 minute
  10, // Limit each IP to 10 questions per minute
  'Too many AI requests from this IP, please try again in a minute'
);