import { ZodError } from "zod";

export function formatZodError(error: ZodError) {
  return {
    message: "Validation failed",
    errors: error.issues.map((err: any) => ({
      field: err.path.join("."),
      message: err.message
    }))
  };
}
