/**
 * Settings Registry using Zod validation
 */

import type { SettingCategory } from "../types/settings";
import { validateSetting } from "../schemas/settings";
import { getSettingCategory, defaultSettings } from "./defaultSettings";

export interface SettingDefinition {
  key: string;
  category: SettingCategory;
  description?: string;
  isPublic?: boolean;
  transform?: (value: unknown) => unknown;
}

class SettingsRegistry {
  private settings = new Map<string, SettingDefinition>();
  private categories = new Map<SettingCategory, Set<string>>();

  register(definition: SettingDefinition): void {
    // Validate the definition
    if (!definition.key) {
      throw new Error("Setting must have a key");
    }

    // Get category from key
    const category = getSettingCategory(definition.key);
    if (!category) {
      throw new Error(`Invalid setting key: ${definition.key}`);
    }

    if (this.settings.has(definition.key)) {
      throw new Error(`Setting with key "${definition.key}" is already registered`);
    }

    // Register the setting
    this.settings.set(definition.key, definition);

    // Add to category index
    if (!this.categories.has(category)) {
      this.categories.set(category, new Set());
    }
    this.categories.get(category)!.add(definition.key);
  }

  get(key: string): SettingDefinition | undefined {
    return this.settings.get(key);
  }

  has(key: string): boolean {
    return this.settings.has(key);
  }

  getAll(): Map<string, SettingDefinition> {
    return new Map(this.settings);
  }

  getByCategory(category: SettingCategory): SettingDefinition[] {
    const keys = this.categories.get(category);
    if (!keys) return [];

    return Array.from(keys)
      .map((key) => this.settings.get(key))
      .filter((setting): setting is SettingDefinition => setting !== undefined);
  }

  getCategories(): SettingCategory[] {
    return Array.from(this.categories.keys());
  }

  validate(key: string, value: unknown): { valid: boolean; error?: string } {
    // Check if setting is registered
    if (!this.has(key)) {
      return { valid: false, error: `Unknown setting: ${key}` };
    }

    // Use shared validation
    const validation = validateSetting(key, value);
    // Convert from { isValid, error } to { valid, error }
    return { valid: validation.isValid, error: validation.error };
  }

  transform(key: string, value: unknown): unknown {
    const setting = this.get(key);
    if (!setting) {
      throw new Error(`Unknown setting: ${key}`);
    }

    if (setting.transform) {
      return setting.transform(value);
    }

    // Default transformations based on type
    const category = getSettingCategory(key);
    if (!category) return value;

    const defaultValue = defaultSettings[key];
    if (defaultValue === undefined) return value;

    const defaultType = typeof defaultValue;

    if (defaultType === "number" && typeof value === "string") {
      return Number(value);
    }

    if (defaultType === "boolean" && typeof value === "string") {
      return value === "true";
    }

    return value;
  }

  getDefaultValue<T>(key: string): T {
    const settingDefinition = defaultSettings[key];
    if (settingDefinition === undefined) {
      throw new Error(`Unknown setting: ${key}`);
    }

    return settingDefinition.defaultValue as T;
  }

  clear(): void {
    this.settings.clear();
    this.categories.clear();
  }
}

// Create a singleton instance
export const settingsRegistry = new SettingsRegistry();

// Helper function to register a setting
export function registerSetting(definition: SettingDefinition): void {
  settingsRegistry.register(definition);
}

// Helper function to create a validator function
export function createValidator(typeGuard: (value: unknown) => boolean, errorMessage?: string) {
  return (value: unknown): boolean => {
    if (typeGuard(value)) {
      return true;
    }
    if (errorMessage) {
      throw new Error(errorMessage);
    }
    return false;
  };
}
