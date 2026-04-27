import { settingsRegistry } from "./settings.registry";
import { settingsService } from "../services/settingsService";

// Generate type-safe setting keys
export const SETTINGS_KEYS = {
  BRANDING: {
    ORGANIZATION_NAME: "branding.organizationName",
    WEBSITE_URL: "branding.websiteUrl",
    CONTACT_EMAIL: "branding.contactEmail",
    DESCRIPTION: "branding.description",
    LOGO_LIGHT: "branding.logoLight",
    LOGO_DARK: "branding.logoDark",
    FAVICON: "branding.favicon",
  },
  THEME: {
    COLORS: {
      PRIMARY: "theme.colors.primary",
      SECONDARY: "theme.colors.secondary",
      SUCCESS: "theme.colors.success",
      WARNING: "theme.colors.warning",
      DANGER: "theme.colors.danger",
      BACKGROUND: "theme.colors.background",
      TEXT: "theme.colors.text",
    },
    TYPOGRAPHY: {
      FONT_FAMILY: "theme.typography.fontFamily",
      HEADING_FONT: "theme.typography.headingFont",
      BODY_FONT: "theme.typography.bodyFont",
      CODE_FONT: "theme.typography.codeFont",
    },
    BORDER_RADIUS: {
      SMALL: "theme.borderRadius.small",
      MEDIUM: "theme.borderRadius.medium",
      LARGE: "theme.borderRadius.large",
    },
  },
  SECURITY: {
    REGISTRATION_ENABLED: "security.registrationEnabled",
    REQUIRE_EMAIL_VERIFICATION: "security.requireEmailVerification",
    ADMIN_APPROVAL_REQUIRED: "security.adminApprovalRequired",
    DEFAULT_USER_ROLE: "security.defaultUserRole",
    SESSION_TIMEOUT: "security.sessionTimeout",
    MAX_SESSIONS_PER_USER: "security.maxSessionsPerUser",
  },
  GENERAL: {
    DEFAULT_DOCUMENTATION_TYPE: "general.defaultDocumentationType",
    DEFAULT_DOCUMENTATION_IS_PUBLIC: "general.defaultDocumentationIsPublic",
    DEFAULT_SHOW_API_ENDPOINTS: "general.defaultShowApiEndpoints",
    AUTO_SAVE_INTERVAL: "general.autoSaveInterval",
    MAINTENANCE_MODE: "general.maintenanceMode",
    MAINTENANCE_MESSAGE: "general.maintenanceMessage",
  },
  ADVANCED: {
    CUSTOM_CSS: "advanced.customCSS",
    CUSTOM_JAVASCRIPT: "advanced.customJavaScript",
    ENABLE_ANALYTICS: "advanced.enableAnalytics",
    ENABLE_TRACKING: "advanced.enableTracking",
  },
} as const;

// Type for all possible setting keys
export type SettingKey =
  | (typeof SETTINGS_KEYS.BRANDING)[keyof typeof SETTINGS_KEYS.BRANDING]
  | (typeof SETTINGS_KEYS.THEME.COLORS)[keyof typeof SETTINGS_KEYS.THEME.COLORS]
  | (typeof SETTINGS_KEYS.THEME.TYPOGRAPHY)[keyof typeof SETTINGS_KEYS.THEME.TYPOGRAPHY]
  | (typeof SETTINGS_KEYS.THEME.BORDER_RADIUS)[keyof typeof SETTINGS_KEYS.THEME.BORDER_RADIUS]
  | (typeof SETTINGS_KEYS.SECURITY)[keyof typeof SETTINGS_KEYS.SECURITY]
  | (typeof SETTINGS_KEYS.GENERAL)[keyof typeof SETTINGS_KEYS.GENERAL]
  | (typeof SETTINGS_KEYS.ADVANCED)[keyof typeof SETTINGS_KEYS.ADVANCED];

// Type-safe setting value types
export type SettingValue<K extends SettingKey> = K extends "branding.organizationName"
  ? string
  : K extends "branding.websiteUrl"
  ? string
  : K extends "branding.contactEmail"
  ? string
  : K extends "branding.description"
  ? string
  : K extends "branding.logoLight"
  ? string
  : K extends "branding.logoDark"
  ? string
  : K extends "branding.favicon"
  ? string
  : K extends "theme.colors.primary"
  ? string
  : K extends "theme.colors.secondary"
  ? string
  : K extends "theme.colors.success"
  ? string
  : K extends "theme.colors.warning"
  ? string
  : K extends "theme.colors.danger"
  ? string
  : K extends "theme.colors.background"
  ? string
  : K extends "theme.colors.text"
  ? string
  : K extends "theme.typography.fontFamily"
  ? string
  : K extends "theme.typography.headingFont"
  ? string
  : K extends "theme.typography.bodyFont"
  ? string
  : K extends "theme.typography.codeFont"
  ? string
  : K extends "theme.borderRadius.small"
  ? string
  : K extends "theme.borderRadius.medium"
  ? string
  : K extends "theme.borderRadius.large"
  ? string
  : K extends "security.registrationEnabled"
  ? boolean
  : K extends "security.requireEmailVerification"
  ? boolean
  : K extends "security.adminApprovalRequired"
  ? boolean
  : K extends "security.defaultUserRole"
  ? "user" | "moderator" | "admin"
  : K extends "security.sessionTimeout"
  ? number
  : K extends "security.maxSessionsPerUser"
  ? number
  : K extends "general.defaultDocumentationType"
  ? "markdown" | "html" | "text"
  : K extends "general.defaultDocumentationIsPublic"
  ? boolean
  : K extends "general.defaultShowApiEndpoints"
  ? boolean
  : K extends "general.autoSaveInterval"
  ? number
  : K extends "general.maintenanceMode"
  ? boolean
  : K extends "general.maintenanceMessage"
  ? string
  : K extends "advanced.customCSS"
  ? string
  : K extends "advanced.customJavaScript"
  ? string
  : K extends "advanced.enableAnalytics"
  ? boolean
  : K extends "advanced.enableTracking"
  ? boolean
  : unknown;

// Type-safe settings accessor functions
export class SettingsAccessor {
  /**
   * Get a setting value with type safety
   */
  static async get<K extends SettingKey>(key: K): Promise<SettingValue<K>> {
    return settingsService.getSetting<SettingValue<K>>(key) as Promise<SettingValue<K>>;
  }

  /**
   * Get multiple settings with type safety
   */
  static async getMany<K extends SettingKey>(keys: K[]): Promise<Record<K, SettingValue<K>>> {
    const result = await settingsService.getSettings(keys);
    return result as Record<K, SettingValue<K>>;
  }

  /**
   * Get all settings in a category with type safety
   */
  static async getByCategory(category: "branding"): Promise<{
    organizationName: string;
    websiteUrl: string;
    contactEmail: string;
    description: string;
    logoLight: string;
    logoDark: string;
    favicon: string;
  }>;

  static async getByCategory(category: "theme"): Promise<{
    colors: {
      primary: string;
      secondary: string;
      success: string;
      warning: string;
      danger: string;
      background: string;
      text: string;
    };
    typography: {
      fontFamily: string;
      headingFont: string;
      bodyFont: string;
      codeFont: string;
    };
    borderRadius: {
      small: string;
      medium: string;
      large: string;
    };
  }>;

  static async getByCategory(category: "security"): Promise<{
    registrationEnabled: boolean;
    requireEmailVerification: boolean;
    adminApprovalRequired: boolean;
    defaultUserRole: "user" | "moderator" | "admin";
    sessionTimeout: number;
    maxSessionsPerUser: number;
  }>;

  static async getByCategory(category: "general"): Promise<{
    defaultDocumentationType: "markdown" | "html" | "text";
    defaultDocumentationIsPublic: boolean;
    defaultShowApiEndpoints: boolean;
    autoSaveInterval: number;
    maintenanceMode: boolean;
    maintenanceMessage: string;
  }>;

  static async getByCategory(category: "advanced"): Promise<{
    customCSS: string;
    customJavaScript: string;
    enableAnalytics: boolean;
    enableTracking: boolean;
  }>;

  static async getByCategory(category: string): Promise<Record<string, unknown>> {
    return settingsService.getSettingsByCategory(category as any);
  }

  /**
   * Update a setting with type safety
   */
  static async update<K extends SettingKey>(key: K, value: SettingValue<K>): Promise<void> {
    return settingsService.updateSetting(key, value);
  }

  /**
   * Update multiple settings with type safety
   */
  static async updateMany<K extends SettingKey>(
    settings: Record<K, SettingValue<K>>
  ): Promise<{ valid: boolean; errors: Record<string, string> }> {
    return settingsService.updateSettings(settings as Record<string, unknown>);
  }

  /**
   * Reset a setting to its default value
   */
  static async reset<K extends SettingKey>(key: K): Promise<void> {
    return settingsService.resetSetting(key);
  }

  /**
   * Reset all settings in a category to their defaults
   */
  static async resetCategory(
    category: "branding" | "theme" | "security" | "general" | "advanced"
  ): Promise<void> {
    return settingsService.resetCategory(category);
  }

  /**
   * Get the default value for a setting
   */
  static getDefaultValue<K extends SettingKey>(key: K): SettingValue<K> {
    return settingsRegistry.getDefaultValue<SettingValue<K>>(key);
  }

  /**
   * Validate a setting value
   */
  static validate<K extends SettingKey>(
    key: K,
    value: unknown
  ): { valid: boolean; error?: string } {
    return settingsRegistry.validate(key, value);
  }

  /**
   * Transform a setting value
   */
  static transform<K extends SettingKey>(key: K, value: unknown): SettingValue<K> {
    return settingsRegistry.transform(key, value) as SettingValue<K>;
  }
}

// Export a convenience instance
export const settings = SettingsAccessor;
