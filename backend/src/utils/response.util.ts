/**
 * Response Utilities - Standardized API response formatting
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  errors?: Record<string, string>;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

export interface PaginatedResponse<T = any> extends ApiResponse<T> {
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Create a success response
 */
export function createSuccessResponse<T>(
  data: T,
  message: string,
  meta?: ApiResponse["meta"]
): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    ...(meta && { meta }),
  };
}

/**
 * Create a paginated response
 */
export function createPaginatedResponse<T>(
  data: T,
  total: number,
  page: number,
  limit: number,
  message: string = "Items retrieved successfully"
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit);

  return {
    success: true,
    data,
    message,
    meta: {
      total,
      page,
      limit,
      totalPages,
    },
  };
}

/**
 * Create an error response
 */
export function createErrorResponse(
  message: string,
  errors?: Record<string, string>,
  status: number = 400
): { json: ApiResponse; status: number } {
  return {
    json: {
      success: false,
      message,
      ...(errors && { errors }),
    },
    status,
  };
}

/**
 * Create a validation error response
 */
export function createValidationErrorResponse(
  errors: Record<string, string>
): { json: ApiResponse; status: number } {
  return createErrorResponse("Validation failed", errors, 400);
}

/**
 * Create a not found response
 */
export function createNotFoundResponse(message: string = "Resource not found"): { json: ApiResponse; status: number } {
  return createErrorResponse(message, undefined, 404);
}

/**
 * Create an unauthorized response
 */
export function createUnauthorizedResponse(message: string = "Unauthorized"): { json: ApiResponse; status: number } {
  return createErrorResponse(message, undefined, 401);
}

/**
 * Create a forbidden response
 */
export function createForbiddenResponse(message: string = "Forbidden"): { json: ApiResponse; status: number } {
  return createErrorResponse(message, undefined, 403);
}

/**
 * Create an internal server error response
 */
export function createInternalErrorResponse(message: string = "Internal server error"): { json: ApiResponse; status: number } {
  return createErrorResponse(message, undefined, 500);
}

/**
 * Handle and format errors consistently
 */
export function handleError(error: unknown): { json: ApiResponse; status: number } {
  console.error("API Error:", error);

  if (error && typeof error === "object") {
    // Handle known error types
    if ("status" in error && typeof error.status === "number") {
      return createErrorResponse(
        error.message || "Error occurred",
        "errors" in error ? error.errors as Record<string, string> : undefined,
        error.status
      );
    }

    // Handle validation errors
    if ("name" in error && error.name === "ValidationError") {
      return createValidationErrorResponse(
        "errors" in error ? error.errors as Record<string, string> : { _: error.message || "Validation failed" }
      );
    }
  }

  // Handle string errors
  if (typeof error === "string") {
    return createErrorResponse(error);
  }

  // Handle Error objects
  if (error instanceof Error) {
    return createErrorResponse(error.message);
  }

  // Default error
  return createInternalErrorResponse();
}