import type { AxiosError } from "axios";

/**
 * Parse Zod validation errors from axios error response
 * @param error - The error object from axios
 * @returns A record of field names to error messages
 */
export function parseZodErrors(error: unknown): Record<string, string> {
  const errors: Record<string, string> = {};

  // Check if it's an axios error with response data
  const axiosError = error as AxiosError<any>;

  if (axiosError?.response?.data?.error?.name === "ZodError") {
    try {
      const zodError = JSON.parse(axiosError.response.data.error.message);

      if (Array.isArray(zodError)) {
        zodError.forEach((err: any) => {
          if (err.path && err.path.length > 0) {
            const field = err.path[0];
            errors[field] = err.message;
          }
        });
      }
    } catch (parseError) {
      console.error("Failed to parse Zod error:", parseError);
    }
  }

  return errors;
}
