import { z } from "zod";

// Zod schemas for different validation types
const urlSchema = z.url().optional().or(z.literal(""));
const emailSchema = z.email().optional().or(z.literal(""));
const colorSchema = z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional().or(z.literal(""));
const cssUnitSchema = z.string().regex(/^[\d.]+(?:px|rem|em|%)$/).optional().or(z.literal(""));

// Settings validation schemas
export const settingsSchemas = {
  // Branding settings
  "branding.organizationName": z.string(),
  "branding.websiteUrl": urlSchema,
  "branding.contactEmail": emailSchema,
  "branding.description": z.string(),
  "branding.logoLight": z.string(),
  "branding.logoDark": z.string(),
  "branding.favicon": z.string(),

  // Theme colors
  "theme.colors.primary": colorSchema,
  "theme.colors.secondary": colorSchema,
  "theme.colors.success": colorSchema,
  "theme.colors.warning": colorSchema,
  "theme.colors.danger": colorSchema,
  "theme.colors.background": colorSchema,
  "theme.colors.text": colorSchema,
  "theme.colors.gradient": z.string().optional().or(z.literal("")),
  "theme.colors.gradientSubtle": z.string().optional().or(z.literal("")),

  // Theme dark colors
  "theme.dark.colors.primary": colorSchema,
  "theme.dark.colors.secondary": colorSchema,
  "theme.dark.colors.success": colorSchema,
  "theme.dark.colors.warning": colorSchema,
  "theme.dark.colors.danger": colorSchema,
  "theme.dark.colors.background": colorSchema,
  "theme.dark.colors.text": colorSchema,
  "theme.dark.colors.gradient": z.string().optional().or(z.literal("")),
  "theme.dark.colors.gradientSubtle": z.string().optional().or(z.literal("")),

  // Theme options
  "theme.options.usePrimaryGradient": z.boolean(),
  "theme.options.useSecondaryGradient": z.boolean(),

  // Theme typography
  "theme.typography.fontFamily": z.string(),
  "theme.typography.headingFont": z.string(),
  "theme.typography.bodyFont": z.string(),
  "theme.typography.codeFont": z.string(),

  // Theme border radius
  "theme.borderRadius.small": cssUnitSchema,
  "theme.borderRadius.medium": cssUnitSchema,
  "theme.borderRadius.large": cssUnitSchema,

  // Security settings
  "security.registrationEnabled": z.boolean(),
  "security.requireEmailVerification": z.boolean(),
  "security.adminApprovalRequired": z.boolean(),
  "security.defaultUserRole": z.enum(["user", "moderator", "admin"]),
  "security.sessionTimeout": z.number().min(0).max(10080),
  "security.maxSessionsPerUser": z.number().min(1).max(20),

  // General settings
  "general.defaultDocumentationType": z.enum(["markdown", "html", "text"]),
  "general.defaultDocumentationIsPublic": z.boolean(),
  "general.defaultShowApiEndpoints": z.boolean(),
  "general.autoSaveInterval": z.number().min(5).max(300),
  "general.maintenanceMode": z.boolean(),
  "general.maintenanceMessage": z.string(),

  // Advanced settings
  "advanced.customCSS": z.string(),
  "advanced.customJavaScript": z.string(),
  "advanced.enableAnalytics": z.boolean(),
  "advanced.enableTracking": z.boolean(),

  // Authentication (SSO / LDAP) settings
  "authentication.saml.enabled": z.boolean(),
  "authentication.saml.entityId": z.string(),
  "authentication.saml.idpMetadata": z.string(),
  "authentication.ldap.enabled": z.boolean(),
  "authentication.ldap.url": z.string(),
  "authentication.ldap.bindDn": z.string(),
  "authentication.ldap.bindCredentials": z.string(),
  "authentication.ldap.userSearchBase": z.string(),
  "authentication.ldap.userSearchFilter": z.string(),
  "authentication.ldap.mailAttribute": z.string(),
  "authentication.ldap.nameAttribute": z.string(),
  "authentication.federated.autoProvision": z.boolean(),
  "authentication.federated.autoLink": z.boolean(),

  // AI Assistant settings
  "ai.enabled": z.boolean(),
  "ai.provider": z.enum(["openai", "anthropic", "google"]),
  "ai.model": z.string(),
  "ai.baseUrl": urlSchema,
  "ai.apiKey": z.string(),
  "ai.maxOutputTokens": z.number().int().min(64).max(8192),
} as const;

// Validate a single setting
export function validateSetting(key: string, value: unknown): { isValid: boolean; error?: string } {
  const schema = settingsSchemas[key as keyof typeof settingsSchemas];
  if (!schema) {
    return { isValid: false, error: `Unknown setting: ${key}` };
  }

  try {
    schema.parse(value);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.issues[0]?.message || "Validation error" };
    }
    return { isValid: false, error: "Validation error" };
  }
}

// Validate multiple settings
export function validateSettings(settings: Record<string, unknown>) {
  const errors: Record<string, string> = {};
  const validSettings: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(settings)) {
    const validation = validateSetting(key, value);
    if (validation.isValid) {
      validSettings[key] = value;
    } else {
      errors[key] = validation.error || `Invalid value for ${key}`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    validSettings,
  };
}
