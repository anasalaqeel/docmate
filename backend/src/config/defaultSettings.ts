// Backend default settings with Zod validation
import type { SettingCategory } from "../types/settings";

// Default settings definitions
export const defaultSettings: Record<string, {
  type: 'string' | 'number' | 'boolean';
  defaultValue: unknown;
  category: SettingCategory;
  isPublic: boolean;
  description?: string;
}> = {
  // Branding
  "branding.organizationName": {
    type: "string",
    defaultValue: "My Organization",
    category: "branding",
    isPublic: true,
    description: "The name of your organization that will be displayed throughout the platform"
  },
  "branding.websiteUrl": {
    type: "string",
    defaultValue: "",
    category: "branding",
    isPublic: true,
    description: "Your organization's main website"
  },
  "branding.contactEmail": {
    type: "string",
    defaultValue: "",
    category: "branding",
    isPublic: true,
    description: "Contact email for support and inquiries"
  },
  "branding.description": {
    type: "string",
    defaultValue: "",
    category: "branding",
    isPublic: true,
    description: "A short description of your organization"
  },
  "branding.logoLight": {
    type: "string",
    defaultValue: "",
    category: "branding",
    isPublic: true,
    description: "URL to the light version of your organization logo"
  },
  "branding.logoDark": {
    type: "string",
    defaultValue: "",
    category: "branding",
    isPublic: true,
    description: "URL to the dark version of your organization logo"
  },
  "branding.favicon": {
    type: "string",
    defaultValue: "",
    category: "branding",
    isPublic: true,
    description: "URL to your organization's favicon"
  },

  // Theme
  "theme.colors.primary": {
    type: "string",
    defaultValue: "#0f766e",
    category: "theme",
    isPublic: true,
    description: "Primary color for the theme"
  },
  "theme.colors.secondary": {
    type: "string",
    defaultValue: "#134e4a",
    category: "theme",
    isPublic: true,
    description: "Secondary color for the theme"
  },
  "theme.colors.success": {
    type: "string",
    defaultValue: "#16a34a",
    category: "theme",
    isPublic: true,
    description: "Success color for the theme"
  },
  "theme.colors.warning": {
    type: "string",
    defaultValue: "#b45309",
    category: "theme",
    isPublic: true,
    description: "Warning color for the theme"
  },
  "theme.colors.danger": {
    type: "string",
    defaultValue: "#b91c1c",
    category: "theme",
    isPublic: true,
    description: "Danger color for the theme"
  },
  "theme.colors.background": {
    type: "string",
    defaultValue: "#f6f7f8",
    category: "theme",
    isPublic: true,
    description: "Background color for the theme"
  },
  "theme.colors.text": {
    type: "string",
    defaultValue: "#1a2029",
    category: "theme",
    isPublic: true,
    description: "Text color for the theme"
  },
  "theme.colors.gradient": {
    type: "string",
    defaultValue: "linear-gradient(135deg, #6d28d9 0%, #4c1d95 100%)",
    category: "theme",
    isPublic: true,
    description: "Primary gradient for the light theme"
  },
  "theme.colors.gradientSubtle": {
    type: "string",
    defaultValue: "linear-gradient(135deg, rgba(109, 40, 217, 0.08) 0%, rgba(76, 29, 149, 0.08) 100%)",
    category: "theme",
    isPublic: true,
    description: "Secondary gradient for the light theme"
  },
  "theme.dark.colors.primary": {
    type: "string",
    defaultValue: "#2dd4bf",
    category: "theme",
    isPublic: true,
    description: "Primary color for the dark theme"
  },
  "theme.dark.colors.secondary": {
    type: "string",
    defaultValue: "#14b8a6",
    category: "theme",
    isPublic: true,
    description: "Secondary color for the dark theme"
  },
  "theme.dark.colors.success": {
    type: "string",
    defaultValue: "#34d399",
    category: "theme",
    isPublic: true,
    description: "Success color for the dark theme"
  },
  "theme.dark.colors.warning": {
    type: "string",
    defaultValue: "#fbbf24",
    category: "theme",
    isPublic: true,
    description: "Warning color for the dark theme"
  },
  "theme.dark.colors.danger": {
    type: "string",
    defaultValue: "#f87171",
    category: "theme",
    isPublic: true,
    description: "Danger color for the dark theme"
  },
  "theme.dark.colors.background": {
    type: "string",
    defaultValue: "#101014",
    category: "theme",
    isPublic: true,
    description: "Background color for the dark theme"
  },
  "theme.dark.colors.text": {
    type: "string",
    defaultValue: "#f2f2f5",
    category: "theme",
    isPublic: true,
    description: "Text color for the dark theme"
  },
  "theme.dark.colors.gradient": {
    type: "string",
    defaultValue: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
    category: "theme",
    isPublic: true,
    description: "Primary gradient for the dark theme"
  },
  "theme.dark.colors.gradientSubtle": {
    type: "string",
    defaultValue: "linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(167, 139, 250, 0.1) 100%)",
    category: "theme",
    isPublic: true,
    description: "Secondary gradient for the dark theme"
  },
  "theme.options.usePrimaryGradient": {
    type: "boolean",
    defaultValue: true,
    category: "theme",
    isPublic: true,
    description: "Whether to use primary gradient"
  },
  "theme.options.useSecondaryGradient": {
    type: "boolean",
    defaultValue: true,
    category: "theme",
    isPublic: true,
    description: "Whether to use secondary gradient"
  },
  "theme.typography.fontFamily": {
    type: "string",
    defaultValue: "system-ui, -apple-system, sans-serif",
    category: "theme",
    isPublic: true,
    description: "Font family for the theme"
  },
  "theme.typography.headingFont": {
    type: "string",
    defaultValue: "system-ui, -apple-system, sans-serif",
    category: "theme",
    isPublic: true,
    description: "Font family for headings"
  },
  "theme.typography.bodyFont": {
    type: "string",
    defaultValue: "system-ui, -apple-system, sans-serif",
    category: "theme",
    isPublic: true,
    description: "Font family for body text"
  },
  "theme.typography.codeFont": {
    type: "string",
    defaultValue: "Monaco, Consolas, monospace",
    category: "theme",
    isPublic: true,
    description: "Font family for code blocks"
  },
  "theme.borderRadius.small": {
    type: "string",
    defaultValue: "0.25rem",
    category: "theme",
    isPublic: true,
    description: "Small border radius for the theme"
  },
  "theme.borderRadius.medium": {
    type: "string",
    defaultValue: "0.375rem",
    category: "theme",
    isPublic: true,
    description: "Medium border radius for the theme"
  },
  "theme.borderRadius.large": {
    type: "string",
    defaultValue: "0.5rem",
    category: "theme",
    isPublic: true,
    description: "Large border radius for the theme"
  },

  // Security
  "security.registrationEnabled": {
    type: "boolean",
    defaultValue: true,
    category: "security",
    isPublic: false,
    description: "Whether user registration is enabled"
  },
  "security.requireEmailVerification": {
    type: "boolean",
    defaultValue: false,
    category: "security",
    isPublic: false,
    description: "Whether email verification is required for new users"
  },
  "security.adminApprovalRequired": {
    type: "boolean",
    defaultValue: false,
    category: "security",
    isPublic: false,
    description: "Whether admin approval is required for new users"
  },
  "security.defaultUserRole": {
    type: "string",
    defaultValue: "user",
    category: "security",
    isPublic: false,
    description: "Default role for new users"
  },
  "security.sessionTimeout": {
    type: "number",
    defaultValue: 1440,
    category: "security",
    isPublic: false,
    description: "Session timeout in minutes (0 for no timeout)"
  },
  "security.maxSessionsPerUser": {
    type: "number",
    defaultValue: 5,
    category: "security",
    isPublic: false,
    description: "Maximum number of active sessions per user"
  },

  // General
  "general.defaultDocumentationType": {
    type: "string",
    defaultValue: "markdown",
    category: "general",
    isPublic: false,
    description: "Default documentation type"
  },
  "general.defaultDocumentationIsPublic": {
    type: "boolean",
    defaultValue: false,
    category: "general",
    isPublic: false,
    description: "Whether new documentation is public by default"
  },
  "general.defaultShowApiEndpoints": {
    type: "boolean",
    defaultValue: true,
    category: "general",
    isPublic: false,
    description: "Whether to show API endpoints by default"
  },
  "general.autoSaveInterval": {
    type: "number",
    defaultValue: 30,
    category: "general",
    isPublic: false,
    description: "Auto-save interval in seconds"
  },
  "general.maintenanceMode": {
    type: "boolean",
    defaultValue: false,
    category: "general",
    isPublic: true,
    description: "Whether application is in maintenance mode"
  },
  "general.maintenanceMessage": {
    type: "string",
    defaultValue: "The system is currently under maintenance. Please try again later.",
    category: "general",
    isPublic: true,
    description: "Message to display during maintenance"
  },

  // Advanced
  "advanced.customCSS": {
    type: "string",
    defaultValue: "",
    category: "advanced",
    isPublic: false,
    description: "Custom CSS to inject into the application"
  },
  "advanced.customJavaScript": {
    type: "string",
    defaultValue: "",
    category: "advanced",
    isPublic: false,
    description: "Custom JavaScript to inject into the application"
  },
  "advanced.enableAnalytics": {
    type: "boolean",
    defaultValue: false,
    category: "advanced",
    isPublic: false,
    description: "Whether to enable analytics tracking"
  },
  "advanced.enableTracking": {
    type: "boolean",
    defaultValue: false,
    category: "advanced",
    isPublic: false,
    description: "Whether to enable user tracking"
  },

  // Authentication (SSO / LDAP)
  "authentication.saml.enabled": {
    type: "boolean",
    defaultValue: false,
    category: "authentication",
    isPublic: true,
    description: "Whether SAML SSO login is enabled"
  },
  "authentication.saml.entityId": {
    type: "string",
    defaultValue: "",
    category: "authentication",
    isPublic: false,
    description: "Service Provider (SP) entity ID for SAML"
  },
  "authentication.saml.idpMetadata": {
    type: "string",
    defaultValue: "",
    category: "authentication",
    isPublic: false,
    description: "Identity Provider metadata XML for SAML"
  },
  "authentication.ldap.enabled": {
    type: "boolean",
    defaultValue: false,
    category: "authentication",
    isPublic: true,
    description: "Whether LDAP/Active Directory login is enabled"
  },
  "authentication.ldap.url": {
    type: "string",
    defaultValue: "",
    category: "authentication",
    isPublic: false,
    description: "LDAP server URL (e.g. ldaps://host:636)"
  },
  "authentication.ldap.bindDn": {
    type: "string",
    defaultValue: "",
    category: "authentication",
    isPublic: false,
    description: "Distinguished name used to search for users"
  },
  "authentication.ldap.bindCredentials": {
    type: "string",
    defaultValue: "",
    category: "authentication",
    isPublic: false,
    description: "Password for the LDAP bind DN"
  },
  "authentication.ldap.userSearchBase": {
    type: "string",
    defaultValue: "",
    category: "authentication",
    isPublic: false,
    description: "Base DN to search for users"
  },
  "authentication.ldap.userSearchFilter": {
    type: "string",
    defaultValue: "(sAMAccountName={username})",
    category: "authentication",
    isPublic: false,
    description: "LDAP filter used to find users; {username} is replaced with the login identifier"
  },
  "authentication.ldap.mailAttribute": {
    type: "string",
    defaultValue: "mail",
    category: "authentication",
    isPublic: false,
    description: "LDAP attribute containing the user's email"
  },
  "authentication.ldap.nameAttribute": {
    type: "string",
    defaultValue: "displayName",
    category: "authentication",
    isPublic: false,
    description: "LDAP attribute containing the user's display name"
  },
  "authentication.federated.autoProvision": {
    type: "boolean",
    defaultValue: true,
    category: "authentication",
    isPublic: false,
    description: "Whether to automatically create local accounts for SSO/LDAP users on first login"
  },
  "authentication.federated.autoLink": {
    type: "boolean",
    defaultValue: true,
    category: "authentication",
    isPublic: false,
    description:
      "Whether SSO/LDAP logins may automatically link to an existing local account with the same email. Disable if self-registration is open and emails are not verified."
  },

  // AI Assistant
  "ai.enabled": {
    type: "boolean",
    defaultValue: false,
    category: "ai",
    isPublic: true,
    description: "Whether the Ask AI assistant is available on documentation pages"
  },
  "ai.provider": {
    type: "string",
    defaultValue: "openai",
    category: "ai",
    isPublic: false,
    description: "AI provider: openai, anthropic, or google"
  },
  "ai.model": {
    type: "string",
    defaultValue: "",
    category: "ai",
    isPublic: false,
    description: "Model identifier for the selected provider (e.g. gpt-4o-mini, claude-sonnet-4-5, gemini-2.0-flash)"
  },
  "ai.baseUrl": {
    type: "string",
    defaultValue: "",
    category: "ai",
    isPublic: false,
    description: "Optional custom API base URL for the openai provider (OpenAI-compatible gateways, Ollama, etc.)"
  },
  "ai.apiKey": {
    type: "string",
    defaultValue: "",
    category: "ai",
    isPublic: false,
    description: "API key for the AI provider (overridden by the AI_API_KEY environment variable when set)"
  },
  "ai.maxOutputTokens": {
    type: "number",
    defaultValue: 1024,
    category: "ai",
    isPublic: false,
    description: "Maximum number of tokens the AI may generate per answer"
  }
};

// Helper function to get category from key
export function getSettingCategory(key: string): SettingCategory | null {
  const [category] = key.split(".");
  const validCategories: SettingCategory[] = ["branding", "theme", "security", "general", "advanced", "authentication", "ai"];
  if (validCategories.includes(category as SettingCategory)) {
    return category as SettingCategory;
  }
  return null;
}

// Legacy interface for backward compatibility
export interface DefaultSettings {
  // Branding settings
  "branding.organizationName": string;
  "branding.websiteUrl": string;
  "branding.contactEmail": string;
  "branding.description": string;
  "branding.logoLight": string;
  "branding.logoDark": string;
  "branding.favicon": string;

  // Theme settings
  "theme.colors.primary": string;
  "theme.colors.secondary": string;
  "theme.colors.success": string;
  "theme.colors.warning": string;
  "theme.colors.danger": string;
  "theme.colors.background": string;
  "theme.colors.text": string;
  "theme.colors.gradient": string;
  "theme.colors.gradientSubtle": string;
  "theme.dark.colors.primary": string;
  "theme.dark.colors.secondary": string;
  "theme.dark.colors.success": string;
  "theme.dark.colors.warning": string;
  "theme.dark.colors.danger": string;
  "theme.dark.colors.background": string;
  "theme.dark.colors.text": string;
  "theme.dark.colors.gradient": string;
  "theme.dark.colors.gradientSubtle": string;
  "theme.options.usePrimaryGradient": boolean;
  "theme.options.useSecondaryGradient": boolean;
  "theme.typography.fontFamily": string;
  "theme.typography.headingFont": string;
  "theme.typography.bodyFont": string;
  "theme.typography.codeFont": string;
  "theme.borderRadius.small": string;
  "theme.borderRadius.medium": string;
  "theme.borderRadius.large": string;

  // Security settings
  "security.registrationEnabled": boolean;
  "security.requireEmailVerification": boolean;
  "security.adminApprovalRequired": boolean;
  "security.defaultUserRole": string;
  "security.sessionTimeout": number;
  "security.maxSessionsPerUser": number;

  // General settings
  "general.defaultDocumentationType": string;
  "general.defaultDocumentationIsPublic": boolean;
  "general.defaultShowApiEndpoints": boolean;
  "general.autoSaveInterval": number;
  "general.maintenanceMode": boolean;
  "general.maintenanceMessage": string;

  // Advanced settings
  "advanced.customCSS": string;
  "advanced.customJavaScript": string;
  "advanced.enableAnalytics": boolean;
  "advanced.enableTracking": boolean;
}

// Legacy constants for backward compatibility
export const DEFAULT_SETTINGS = defaultSettings;
export const SETTING_CATEGORIES = {
  BRANDING: "branding",
  THEME: "theme",
  SECURITY: "security",
  GENERAL: "general",
  ADVANCED: "advanced",
  AUTHENTICATION: "authentication",
} as const;

// Legacy helper functions for backward compatibility
export function getSettingDefaultsByCategory(category: SettingCategory): Record<string, unknown> {
  return Object.entries(defaultSettings).reduce((acc, [key, value]) => {
    if (key.startsWith(`${category}.`)) {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, unknown>);
}

// Legacy validation function for backward compatibility
export function validateSettingValue(key: string, value: unknown): boolean {
  // This function is deprecated - use validateSetting from schemas/settings.ts instead
  console.warn('validateSettingValue is deprecated - use validateSetting from schemas/settings.ts');
  return true; // Temporary fallback
}
