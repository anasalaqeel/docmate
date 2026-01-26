import logger from '../logger';

/**
 * Simplified error handling utilities
 */

interface SanitizedError {
  message: string;
  code?: string;
  details?: any;
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

// Main error sanitization function
export function sanitizeError(error: any, type: string = 'general'): SanitizedError {
  if (isProduction()) {
    // Production: hide sensitive details
    const messages = {
      auth: 'Authentication failed',
      validation: 'Validation failed',
      database: 'Database operation failed',
      rate_limit: 'Too many requests',
      general: 'An error occurred'
    };
    return { message: messages[type as keyof typeof messages] || messages.general };
  }

  // Development: show full details
  if (type === 'validation' && error?.errors) {
    return {
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: error.errors.map((e: any) => ({
        field: e.path?.join('.'),
        message: e.message
      }))
    };
  }

  return {
    message: error?.message || 'Unknown error',
    code: type.toUpperCase(),
    details: error
  };
}

// Create standardized error response
export function createErrorResponse(error: SanitizedError, status: number = 500) {
  return {
    success: false,
    message: error.message,
    ...(error.code && { code: error.code }),
    ...(error.details && !isProduction() && { details: error.details })
  };
}

// Production error handler middleware
export function handleProductionError(error: any, type: string = 'general', context?: any) {
  // Log full error for debugging using the existing logger
  logger.error(`Application Error [${type.toUpperCase()}]: ${error.message}`, {
    stack: error.stack,
    type,
    context,
    timestamp: new Date().toISOString()
  });

  const sanitized = sanitizeError(error, type);
  const statusCode = type === 'validation' ? 400 :
                     type === 'auth' ? 401 :
                     type === 'authorization' ? 403 :
                     type === 'rate_limit' ? 429 : 500;

  return { error: sanitized, statusCode };
}