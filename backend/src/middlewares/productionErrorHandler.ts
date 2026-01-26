import { Context, Next } from 'hono';
import { ZodError } from 'zod';
import { handleProductionError, createErrorResponse } from '../utils/errorSanitizer';

/**
 * Simplified production error handling middleware
 */
export async function productionErrorHandler(c: Context, next: Next) {
  try {
    await next();
  } catch (error) {
    // Determine error type
    let type = 'general';
    const errorObj = error as any;
    if (error instanceof ZodError) type = 'validation';
    else if (errorObj?.status === 401 || errorObj?.message?.toLowerCase().includes('auth')) type = 'auth';
    else if (errorObj?.status === 403) type = 'authorization';
    else if (errorObj?.status === 429) type = 'rate_limit';
    else if (errorObj?.message?.toLowerCase().includes('database')) type = 'database';

    // Handle error and get response with context
    const context = {
      endpoint: c.req.path,
      method: c.req.method,
      ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
      userAgent: c.req.header('user-agent')
    };

    const { error: sanitizedError, statusCode } = handleProductionError(error, type, context);
    const response = createErrorResponse(sanitizedError);

    return c.json(response, statusCode as any);
  }
}