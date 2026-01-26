import { z } from "zod";

// Strong password validation (reusing from users.ts for consistency)
const strongPasswordSchema = z.string()
  .min(12, "Password must be at least 12 characters long")
  .max(128, "Password must be less than 128 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character")
  .refine((val) => !val.toLowerCase().includes('password'), "Password cannot contain common words")
  .refine((val) => !val.includes('<') && !val.includes('>'), "Password contains invalid characters");

// Enhanced email validation
const emailSchema = z.string()
  .email("Valid email is required")
  .max(254, "Email must be less than 254 characters")
  .transform((val) => val.toLowerCase().trim())
  .refine((val) => !val.includes('<') && !val.includes('>'), "Email contains invalid characters");

// Enhanced name validation
const nameSchema = z.string()
  .min(1, "Name is required")
  .max(100, "Name must be less than 100 characters")
  .regex(/^[a-zA-Z\s\-'\.]+$/, "Name can only contain letters, spaces, hyphens, and apostrophes")
  .refine((val) => !/<script|javascript:/i.test(val), "Name contains invalid content");

// URL validation
const urlSchema = z.string()
  .url("Valid URL is required")
  .max(500, "URL must be less than 500 characters")
  .refine((val) => !val.includes('javascript:') && !val.includes('<script'), "URL contains invalid content")
  .optional();

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: strongPasswordSchema,
  redirectUrl: urlSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export type RegisterRequest = z.infer<typeof registerSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;