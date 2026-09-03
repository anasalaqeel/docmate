// Backend types for settings validation
export type SettingCategory =
  | "branding"
  | "theme"
  | "security"
  | "general"
  | "advanced"
  | "authentication"
  | "ai";

export interface SettingDefinition<T = unknown> {
  key: string;
  category: SettingCategory;
  defaultValue: T;
  validate: (value: unknown) => value is T;
  transform?: (value: unknown) => T;
  description?: string;
  isPublic?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface ValidationResponse {
  isValid: boolean;
  errors: Record<string, string>;
  validSettings: Record<string, unknown>;
}
