import { Context, Next } from 'hono';
import { ZodError } from 'zod';
import { HTTPException } from 'hono/http-exception';

// Error codes for better categorization
export enum ErrorCode {
  // Validation errors (400)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',

  // Authentication errors (401)
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  UNAUTHORIZED = 'UNAUTHORIZED',

  // Authorization errors (403)
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // Not found errors (404)
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  DOCUMENTATION_NOT_FOUND = 'DOCUMENTATION_NOT_FOUND',

  // Conflict errors (409)
  DUPLICATE_RESOURCE = 'DUPLICATE_RESOURCE',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',

  // Rate limiting (429)
  RATE_LIMITED = 'RATE_LIMITED',

  // Server errors (500)
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',

  // File system errors
  FILE_UPLOAD_ERROR = 'FILE_UPLOAD_ERROR',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED'
}

export interface AppError {
  code: ErrorCode;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  requestId?: string;
  stack?: string;
  userFriendly?: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    userFriendly?: string;
    details?: Record<string, any>;
    requestId?: string;
    timestamp: string;
  };
  status?: HonoStatusCode;
}

// Hono-compatible status codes
type HonoStatusCode = 400 | 401 | 403 | 404 | 409 | 413 | 422 | 429 | 500 | 502;

// Helper functions to create specific errors
export function createError(
  code: ErrorCode,
  message: string,
  details?: Record<string, any>,
  userFriendly?: string
): AppError {
  return {
    code,
    message,
    details,
    timestamp: new Date(),
    userFriendly: userFriendly || message
  };
}

// Specific error creators
export const errorCreators = {
  validation: (field: string, message?: string) => createError(
    ErrorCode.VALIDATION_ERROR,
    `Validation failed for ${field}`,
    { field },
    message || `Invalid value provided for ${field}`
  ),

  invalidInput: (input: string, expected: string) => createError(
    ErrorCode.INVALID_INPUT,
    `Invalid input: ${input}`,
    { input, expected },
    `Please provide a valid ${expected}`
  ),

  unauthorized: (message?: string) => createError(
    ErrorCode.UNAUTHORIZED,
    message || 'Authentication required',
    undefined,
    'You need to be logged in to access this resource'
  ),

  forbidden: (permission?: string) => createError(
    ErrorCode.FORBIDDEN,
    permission ? `Permission denied: ${permission}` : 'Access forbidden',
    { permission },
    'You do not have permission to access this resource'
  ),

  notFound: (resource: string, identifier?: string) => createError(
    ErrorCode.RESOURCE_NOT_FOUND,
    `${resource} not found`,
    { resource, identifier },
    `The requested ${resource.toLowerCase()} could not be found`
  ),

  rateLimited: (retryAfter?: number) => createError(
    ErrorCode.RATE_LIMITED,
    'Rate limit exceeded',
    { retryAfter },
    retryAfter
      ? `Too many requests. Please try again in ${retryAfter} seconds`
      : 'Too many requests. Please try again later'
  ),

  internal: (message: string, details?: Record<string, any>) => createError(
    ErrorCode.INTERNAL_SERVER_ERROR,
    message,
    details,
    'An unexpected error occurred. Please try again later'
  ),

  database: (operation: string, details?: Record<string, any>) => createError(
    ErrorCode.DATABASE_ERROR,
    `Database operation failed: ${operation}`,
    { operation, ...details },
    'A data storage error occurred. Please try again later'
  ),

  fileUpload: (error: string) => createError(
    ErrorCode.FILE_UPLOAD_ERROR,
    `File upload failed: ${error}`,
    undefined,
    `Failed to upload file: ${error}`
  ),

  quotaExceeded: (type: string, limit?: number) => createError(
    ErrorCode.QUOTA_EXCEEDED,
    `${type} quota exceeded`,
    { type, limit },
    `You have exceeded your ${type} limit`
  )
};

// Log error for monitoring
function logError(error: AppError, context?: {
  requestId?: string;
  userId?: number;
  ip?: string;
  userAgent?: string;
  method?: string;
  url?: string;
}) {
  const logData = {
    ...error,
    context,
    level: 'error'
  };

  console.error('Application Error:', JSON.stringify(logData, null, 2));
}

// Main error handler middleware
export function errorHandler(error: Error | AppError | ZodError | HTTPException, c: Context, next: Next) {
  // Skip if error has already been handled
  if (c.get('errorHandled')) {
    return next();
  }

  // Mark error as handled
  c.set('errorHandled', true);

  // Generate request ID for tracking
  const requestId = c.get('requestId') || crypto.randomUUID();

  // Context for logging
  const errorContext = {
    requestId,
    userId: c.get('userId'),
    ip: c.get('clientIP'),
    userAgent: c.req.header('user-agent'),
    method: c.req.method,
    url: c.req.url
  };

  let appError: AppError;
  let statusCode: number = 500;

  // Handle different error types
  if (error instanceof ZodError) {
    appError = errorCreators.validation('input', error.message);
    statusCode = 400;
  } else if (error instanceof HTTPException) {
    appError = createError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      error.message,
      { status: error.status }
    );
    statusCode = error.status;
  } else if ('code' in error && 'message' in error) {
    // It's already an AppError
    appError = error as AppError;
    statusCode = getStatusCodeForErrorCode(appError.code);
  } else {
    // Unknown error
    appError = errorCreators.internal(error.message, {
      name: error.name,
      stack: error.stack
    });
  }

  // Add request ID to error
  appError.requestId = requestId;

  // Log the error
  logError(appError, errorContext);

  // Create error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      userFriendly: appError.userFriendly,
      details: appError.details,
      requestId: appError.requestId,
      timestamp: appError.timestamp.toISOString()
    },
    status: statusCode as HonoStatusCode
  };

  // Set appropriate headers for CORS
  c.header('Content-Type', 'application/json');
  c.header('X-Request-ID', requestId);

  const status = getHonoStatus(statusCode);
  return c.json(errorResponse, status);
}

// Helper to get HTTP status code for error code
function getStatusCodeForErrorCode(code: ErrorCode): number {
  const statusMap: Record<ErrorCode, number> = {
    [ErrorCode.VALIDATION_ERROR]: 400,
    [ErrorCode.INVALID_INPUT]: 400,
    [ErrorCode.MISSING_REQUIRED_FIELD]: 400,
    [ErrorCode.INVALID_FILE_TYPE]: 400,
    [ErrorCode.FILE_TOO_LARGE]: 413,
    [ErrorCode.INVALID_CREDENTIALS]: 401,
    [ErrorCode.TOKEN_EXPIRED]: 401,
    [ErrorCode.UNAUTHORIZED]: 401,
    [ErrorCode.FORBIDDEN]: 403,
    [ErrorCode.INSUFFICIENT_PERMISSIONS]: 403,
    [ErrorCode.RESOURCE_NOT_FOUND]: 404,
    [ErrorCode.USER_NOT_FOUND]: 404,
    [ErrorCode.DOCUMENTATION_NOT_FOUND]: 404,
    [ErrorCode.DUPLICATE_RESOURCE]: 409,
    [ErrorCode.EMAIL_ALREADY_EXISTS]: 409,
    [ErrorCode.RATE_LIMITED]: 429,
    [ErrorCode.INTERNAL_SERVER_ERROR]: 500,
    [ErrorCode.DATABASE_ERROR]: 500,
    [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
    [ErrorCode.FILE_UPLOAD_ERROR]: 500,
    [ErrorCode.FILE_NOT_FOUND]: 404,
    [ErrorCode.QUOTA_EXCEEDED]: 422
  };

  return statusMap[code] || 500;
}

// Helper to get proper HTTP status type for Hono
function getHonoStatus(status: number): 400 | 401 | 403 | 404 | 409 | 413 | 422 | 429 | 500 | 502 {
  // This ensures we only return valid HTTP status codes that Hono expects
  const validStatuses = [400, 401, 403, 404, 409, 413, 422, 429, 500, 502];
  return validStatuses.includes(status) ? status as 400 | 401 | 403 | 404 | 409 | 413 | 422 | 429 | 500 | 502 : 500;
}

// Wrapper function to use in routes
export function handleError(
  error: Error | AppError,
  context?: {
    code?: ErrorCode;
    message?: string;
    details?: Record<string, any>;
    userFriendly?: string;
  }
): never {
  if (context) {
    throw createError(
      context.code || ErrorCode.INTERNAL_SERVER_ERROR,
      context.message || error.message,
      context.details,
      context.userFriendly
    );
  }
  throw error;
}

// Async error wrapper for routes
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      // Re-throw to be handled by the middleware
      throw error;
    }
  };
}