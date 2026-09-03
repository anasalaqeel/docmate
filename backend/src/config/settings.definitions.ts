/**
 * Settings Definitions using shared validation package
 */

import { registerSetting } from "./settings.registry";

// Branding Settings
registerSetting({
  key: "branding.organizationName",
  category: "branding",
  description: "The name of your organization that will be displayed throughout the platform",
  isPublic: true,
});

registerSetting({
  key: "branding.websiteUrl",
  category: "branding",
  description: "Your organization's main website",
  isPublic: true,
});

registerSetting({
  key: "branding.contactEmail",
  category: "branding",
  description: "Contact email for support and inquiries",
  isPublic: true,
});

registerSetting({
  key: "branding.description",
  category: "branding",
  description: "A short description of your organization",
  isPublic: true,
});

registerSetting({
  key: "branding.logoLight",
  category: "branding",
  description: "URL to the light version of your organization logo",
  isPublic: true,
});

registerSetting({
  key: "branding.logoDark",
  category: "branding",
  description: "URL to the dark version of your organization logo",
  isPublic: true,
});

registerSetting({
  key: "branding.favicon",
  category: "branding",
  description: "URL to your organization's favicon",
  isPublic: true,
});

// Theme Settings
registerSetting({
  key: "theme.colors.primary",
  category: "theme",
  description: "Primary color for the theme",
  isPublic: true,
});

registerSetting({
  key: "theme.colors.secondary",
  category: "theme",
  description: "Secondary color for the theme",
  isPublic: true,
});

registerSetting({
  key: "theme.colors.success",
  category: "theme",
  description: "Success color for the theme",
  isPublic: true,
});

registerSetting({
  key: "theme.colors.warning",
  category: "theme",
  description: "Warning color for the theme",
  isPublic: true,
});

registerSetting({
  key: "theme.colors.danger",
  category: "theme",
  description: "Danger color for the theme",
  isPublic: true,
});

registerSetting({
  key: "theme.colors.background",
  category: "theme",
  description: "Background color for the theme",
  isPublic: true,
});

registerSetting({
  key: "theme.colors.text",
  category: "theme",
  description: "Text color for the theme",
  isPublic: true,
});

registerSetting({
  key: "theme.colors.gradient",
  category: "theme",
  description: "Primary gradient for the light theme",
  isPublic: true,
});

registerSetting({
  key: "theme.colors.gradientSubtle",
  category: "theme",
  description: "Secondary gradient for the light theme",
  isPublic: true,
});

// Theme Dark Mode Overrides
registerSetting({
  key: "theme.dark.colors.primary",
  category: "theme",
  description: "Primary color for the dark theme",
  isPublic: true,
});

registerSetting({
  key: "theme.dark.colors.secondary",
  category: "theme",
  description: "Secondary color for the dark theme",
  isPublic: true,
});

registerSetting({
  key: "theme.dark.colors.success",
  category: "theme",
  description: "Success color for the dark theme",
  isPublic: true,
});

registerSetting({
  key: "theme.dark.colors.warning",
  category: "theme",
  description: "Warning color for the dark theme",
  isPublic: true,
});

registerSetting({
  key: "theme.dark.colors.danger",
  category: "theme",
  description: "Danger color for the dark theme",
  isPublic: true,
});

registerSetting({
  key: "theme.dark.colors.background",
  category: "theme",
  description: "Background color for the dark theme",
  isPublic: true,
});

registerSetting({
  key: "theme.dark.colors.text",
  category: "theme",
  description: "Text color for the dark theme",
  isPublic: true,
});

registerSetting({
  key: "theme.dark.colors.gradient",
  category: "theme",
  description: "Primary gradient for the dark theme",
  isPublic: true,
});

registerSetting({
  key: "theme.dark.colors.gradientSubtle",
  category: "theme",
  description: "Secondary gradient for the dark theme",
  isPublic: true,
});

// Theme Options
registerSetting({
  key: "theme.options.usePrimaryGradient",
  category: "theme",
  description: "Whether to use primary gradient",
  isPublic: true,
});

registerSetting({
  key: "theme.options.useSecondaryGradient",
  category: "theme",
  description: "Whether to use secondary gradient",
  isPublic: true,
});

registerSetting({
  key: "theme.typography.fontFamily",
  category: "theme",
  description: "Font family for the theme",
  isPublic: true,
});

registerSetting({
  key: "theme.typography.headingFont",
  category: "theme",
  description: "Font family for headings",
  isPublic: true,
});

registerSetting({
  key: "theme.typography.bodyFont",
  category: "theme",
  description: "Font family for body text",
  isPublic: true,
});

registerSetting({
  key: "theme.typography.codeFont",
  category: "theme",
  description: "Font family for code blocks",
  isPublic: true,
});

registerSetting({
  key: "theme.borderRadius.small",
  category: "theme",
  description: "Small border radius for the theme",
  isPublic: true,
});

registerSetting({
  key: "theme.borderRadius.medium",
  category: "theme",
  description: "Medium border radius for the theme",
  isPublic: true,
});

registerSetting({
  key: "theme.borderRadius.large",
  category: "theme",
  description: "Large border radius for the theme",
  isPublic: true,
});

// Security Settings
registerSetting({
  key: "security.registrationEnabled",
  category: "security",
  description: "Whether user registration is enabled",
  isPublic: false,
});

registerSetting({
  key: "security.requireEmailVerification",
  category: "security",
  description: "Whether email verification is required for new users",
  isPublic: false,
});

registerSetting({
  key: "security.adminApprovalRequired",
  category: "security",
  description: "Whether admin approval is required for new users",
  isPublic: false,
});

registerSetting({
  key: "security.defaultUserRole",
  category: "security",
  description: "Default role for new users",
  isPublic: false,
});

registerSetting({
  key: "security.sessionTimeout",
  category: "security",
  description: "Session timeout in minutes (0 for no timeout)",
  isPublic: false,
  transform: (value) => typeof value === "string" ? Number(value) : value,
});

registerSetting({
  key: "security.maxSessionsPerUser",
  category: "security",
  description: "Maximum number of active sessions per user",
  isPublic: false,
  transform: (value) => typeof value === "string" ? Number(value) : value,
});

// General Settings
registerSetting({
  key: "general.defaultDocumentationType",
  category: "general",
  description: "Default documentation type",
  isPublic: false,
});

registerSetting({
  key: "general.defaultDocumentationIsPublic",
  category: "general",
  description: "Whether new documentation is public by default",
  isPublic: false,
});

registerSetting({
  key: "general.defaultShowApiEndpoints",
  category: "general",
  description: "Whether to show API endpoints by default",
  isPublic: false,
});

registerSetting({
  key: "general.autoSaveInterval",
  category: "general",
  description: "Auto-save interval in seconds",
  isPublic: false,
  transform: (value) => typeof value === "string" ? Number(value) : value,
});

registerSetting({
  key: "general.maintenanceMode",
  category: "general",
  description: "Whether the application is in maintenance mode",
  isPublic: true,
});

registerSetting({
  key: "general.maintenanceMessage",
  category: "general",
  description: "Message to display during maintenance",
  isPublic: true,
});

// Advanced Settings
registerSetting({
  key: "advanced.customCSS",
  category: "advanced",
  description: "Custom CSS to inject into the application",
  isPublic: false,
});

registerSetting({
  key: "advanced.customJavaScript",
  category: "advanced",
  description: "Custom JavaScript to inject into the application",
  isPublic: false,
});

registerSetting({
  key: "advanced.enableAnalytics",
  category: "advanced",
  description: "Whether to enable analytics tracking",
  isPublic: false,
});

registerSetting({
  key: "advanced.enableTracking",
  category: "advanced",
  description: "Whether to enable user tracking",
  isPublic: false,
});

// Authentication (SSO / LDAP) Settings
registerSetting({
  key: "authentication.saml.enabled",
  category: "authentication",
  description: "Whether SAML SSO login is enabled",
  isPublic: true,
});

registerSetting({
  key: "authentication.saml.entityId",
  category: "authentication",
  description: "Service Provider (SP) entity ID for SAML",
  isPublic: false,
});

registerSetting({
  key: "authentication.saml.idpMetadata",
  category: "authentication",
  description: "Identity Provider metadata XML for SAML",
  isPublic: false,
});

registerSetting({
  key: "authentication.ldap.enabled",
  category: "authentication",
  description: "Whether LDAP/Active Directory login is enabled",
  isPublic: true,
});

registerSetting({
  key: "authentication.ldap.url",
  category: "authentication",
  description: "LDAP server URL (e.g. ldaps://host:636)",
  isPublic: false,
});

registerSetting({
  key: "authentication.ldap.bindDn",
  category: "authentication",
  description: "Distinguished name used to search for users",
  isPublic: false,
});

registerSetting({
  key: "authentication.ldap.bindCredentials",
  category: "authentication",
  description: "Password for the LDAP bind DN",
  isPublic: false,
});

registerSetting({
  key: "authentication.ldap.userSearchBase",
  category: "authentication",
  description: "Base DN to search for users",
  isPublic: false,
});

registerSetting({
  key: "authentication.ldap.userSearchFilter",
  category: "authentication",
  description: "LDAP filter used to find users; {username} is replaced with the login identifier",
  isPublic: false,
});

registerSetting({
  key: "authentication.ldap.mailAttribute",
  category: "authentication",
  description: "LDAP attribute containing the user's email",
  isPublic: false,
});

registerSetting({
  key: "authentication.ldap.nameAttribute",
  category: "authentication",
  description: "LDAP attribute containing the user's display name",
  isPublic: false,
});

registerSetting({
  key: "authentication.federated.autoProvision",
  category: "authentication",
  description: "Whether to automatically create local accounts for SSO/LDAP users on first login",
  isPublic: false,
});

registerSetting({
  key: "authentication.federated.autoLink",
  category: "authentication",
  description:
    "Whether SSO/LDAP logins may automatically link to an existing local account with the same email. Disable if self-registration is open and emails are not verified.",
  isPublic: false,
});

// AI Assistant Settings
registerSetting({
  key: "ai.enabled",
  category: "ai",
  description: "Whether the Ask AI assistant is available on documentation pages",
  isPublic: true,
});

registerSetting({
  key: "ai.provider",
  category: "ai",
  description: "AI provider: openai, anthropic, or google",
  isPublic: false,
});

registerSetting({
  key: "ai.model",
  category: "ai",
  description: "Model identifier for the selected provider (e.g. gpt-4o-mini, claude-sonnet-4-5, gemini-2.0-flash)",
  isPublic: false,
});

registerSetting({
  key: "ai.baseUrl",
  category: "ai",
  description: "Optional custom API base URL for the openai provider (OpenAI-compatible gateways, Ollama, etc.)",
  isPublic: false,
});

registerSetting({
  key: "ai.apiKey",
  category: "ai",
  description: "API key for the AI provider (overridden by the AI_API_KEY environment variable when set)",
  isPublic: false,
});

registerSetting({
  key: "ai.maxOutputTokens",
  category: "ai",
  description: "Maximum number of tokens the AI may generate per answer",
  isPublic: false,
  transform: (value) => typeof value === "string" ? Number(value) : value,
});