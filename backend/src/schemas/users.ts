import { z } from "zod";

// Enhanced password validation
const strongPasswordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters long")
  .max(128, "Password must be less than 128 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character")
  .refine((val) => !val.toLowerCase().includes("password"), "Password cannot contain common words")
  .refine(
    (val) => !val.includes("<") && !val.includes(">"),
    "Password contains invalid characters"
  );

// Enhanced email validation
const emailSchema = z
  .email("Valid email is required")
  .max(254, "Email must be less than 254 characters")
  .transform((val) => val.toLowerCase().trim())
  .refine((val) => !val.includes("<") && !val.includes(">"), "Email contains invalid characters");

// Enhanced name validation
const nameSchema = z
  .string()
  .min(1, "Name is required")
  .max(100, "Name must be less than 100 characters")
  .regex(/^[a-zA-Z\s\-'\.]+$/, "Name can only contain letters, spaces, hyphens, and apostrophes")
  .refine((val) => !/<script|javascript:/i.test(val), "Name contains invalid content");

// Enhanced phone validation
const phoneSchema = z
  .string()
  .regex(/^[\d\+\-\(\)\s]+$/, "Invalid phone number format")
  .max(20, "Phone number must be less than 20 characters")
  .optional()
  .nullable();

// User creation schema
export const adminCreateUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: strongPasswordSchema,
  phone: phoneSchema,
  status: z.enum(["active", "inactive"]).default("active").optional(),
  roleIds: z.array(z.number().int().positive()).min(1).max(10).optional(),
});

// User update schema
export const adminUpdateUserSchema = z.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  password: strongPasswordSchema.optional(),
  phone: phoneSchema.optional(),
  status: z.enum(["active", "inactive"]).optional(),
  roleIds: z.array(z.number().int().positive()).min(1).max(10).optional(),
});

// Role assignment schema
export const assignRolesSchema = z.object({
  roleIds: z.array(z.number().int().positive()).min(1, "At least one role must be provided"),
});

// Query parameters for users list
export const usersQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().max(100).trim().optional(),
  sortBy: z.enum(["name", "email", "createdAt", "updatedAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  roleIds: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return [];
      return val
        .split(",")
        .map((id) => parseInt(id.trim()))
        .filter((id) => !isNaN(id));
    }),
  status: z.enum(["active", "inactive"]).optional(),
});

// User changing their own password (requires current password)
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: strongPasswordSchema,
    confirmPassword: z.string().min(1, "Password confirmation is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

// Admin resetting user's password (doesn't require current password)
export const adminResetPasswordSchema = z
  .object({
    newPassword: strongPasswordSchema,
    confirmPassword: z.string().min(1, "Password confirmation is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// Export types
export type AdminCreateUserRequest = z.infer<typeof adminCreateUserSchema>;
export type AdminUpdateUserRequest = z.infer<typeof adminUpdateUserSchema>;
export type AssignRolesRequest = z.infer<typeof assignRolesSchema>;
export type UsersQueryRequest = z.infer<typeof usersQuerySchema>;
export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>;
export type AdminResetPasswordRequest = z.infer<typeof adminResetPasswordSchema>;
