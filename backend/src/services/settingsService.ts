/**
 * Settings Service - Business logic for settings management
 */

import db from "../db";
import { systemSettings } from "../db/schema";
import { eq, inArray } from "drizzle-orm";
import { settingsRegistry } from "../config/settings.registry";
import type { SettingCategory } from "../types/settings";

export interface SettingsQueryOptions {
  category?: SettingCategory;
  isPublic?: boolean;
  includePrivate?: boolean;
}

export interface BulkUpdateOptions {
  validateAll?: boolean;
  stopOnFirstError?: boolean;
  transaction?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export class SettingsService {
  /**
   * Get a single setting value by key
   */
  async getSetting<T = unknown>(key: string): Promise<T> {
    // Validate key exists
    if (!settingsRegistry.has(key)) {
      throw new Error(`Unknown setting: ${key}`);
    }

    // Try to get from database
    const dbSetting = await db.query.systemSettings.findFirst({
      where: eq(systemSettings.key, key)
    });

    // Return database value or default
    if (dbSetting) {
      return settingsRegistry.transform(key, dbSetting.value) as T;
    }

    // Return default value
    return settingsRegistry.getDefaultValue<T>(key);
  }

  /**
   * Get multiple settings by keys
   */
  async getSettings(keys: string[]): Promise<Record<string, unknown>> {
    const settings: Record<string, unknown> = {};

    // Validate all keys first
    for (const key of keys) {
      if (!settingsRegistry.has(key)) {
        throw new Error(`Unknown setting: ${key}`);
      }
    }

    // Fetch from database
    const dbSettings = await db.query.systemSettings.findMany({
      where: inArray(systemSettings.key, keys)
    });

    // Build result object
    for (const key of keys) {
      const dbSetting = dbSettings.find((s) => s.key === key);
      if (dbSetting) {
        settings[key] = settingsRegistry.transform(key, dbSetting.value);
      } else {
        settings[key] = settingsRegistry.getDefaultValue(key);
      }
    }

    return settings;
  }

  /**
   * Get all settings with optional filtering
   */
  async getAllSettings(options: SettingsQueryOptions = {}): Promise<Record<string, unknown>> {
    const { category, isPublic, includePrivate = true } = options;

    // Get all registered settings
    const allDefinitions = Array.from(settingsRegistry.getAll().values());

    // Filter definitions
    const filteredDefinitions = allDefinitions.filter((def) => {
      if (category && def.category !== category) return false;
      if (isPublic !== undefined && def.isPublic !== isPublic) return false;
      if (!includePrivate && !def.isPublic) return false;
      return true;
    });

    // Get setting keys
    const keys = filteredDefinitions.map((def) => def.key);

    // Return all settings
    return this.getSettings(keys);
  }

  /**
   * Update a single setting
   */
  async updateSetting(key: string, value: unknown): Promise<void> {
    // Validate setting
    const validation = settingsRegistry.validate(key, value);
    if (!validation.valid) {
      throw new Error(validation.error || "Invalid value");
    }

    // Transform value
    const transformedValue = settingsRegistry.transform(key, value);

    // Get definition
    const definition = settingsRegistry.get(key);
    if (!definition) {
      throw new Error(`Unknown setting: ${key}`);
    }

    // Upsert setting
    await db.insert(systemSettings).values({
      key,
      value: transformedValue,
      category: definition.category,
      description: definition.description,
      isPublic: definition.isPublic ?? false,
    }).onConflictDoUpdate({
      target: systemSettings.key,
      set: {
        value: transformedValue,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Update multiple settings
   */
  async updateSettings(
    settings: Record<string, unknown>,
    options: BulkUpdateOptions = {}
  ): Promise<ValidationResult> {
    const { validateAll = true, stopOnFirstError = false, transaction = true } = options;
    const errors: Record<string, string> = {};

    // Validate all settings first if requested
    if (validateAll) {
      for (const [key, value] of Object.entries(settings)) {
        const validation = settingsRegistry.validate(key, value);
        if (!validation.valid) {
          errors[key] = validation.error || "Invalid value";
          if (stopOnFirstError) {
            return { valid: false, errors };
          }
        }
      }

      if (Object.keys(errors).length > 0) {
        return { valid: false, errors };
      }
    }

    // Update settings
    const updateOperation = async () => {
      for (const [key, value] of Object.entries(settings)) {
        try {
          // Validate each setting
          const validation = settingsRegistry.validate(key, value);
          if (!validation.valid) {
            errors[key] = validation.error || "Invalid value";
            if (stopOnFirstError) {
              throw new Error(`Validation failed for ${key}: ${validation.error}`);
            }
            continue;
          }

          // Get definition
          const definition = settingsRegistry.get(key);
          if (!definition) {
            errors[key] = `Unknown setting: ${key}`;
            if (stopOnFirstError) {
              throw new Error(`Unknown setting: ${key}`);
            }
            continue;
          }

          // Transform value
          const transformedValue = settingsRegistry.transform(key, value);

          // Upsert setting
          await db.insert(systemSettings).values({
            key,
            value: transformedValue,
            category: definition.category,
            description: definition.description,
            isPublic: definition.isPublic ?? false,
          }).onConflictDoUpdate({
            target: systemSettings.key,
            set: {
              value: transformedValue,
              updatedAt: new Date()
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          errors[key] = errorMessage;
          if (stopOnFirstError) {
            throw error;
          }
        }
      }
    };

    // Execute with or without transaction
    if (transaction) {
      await db.transaction(updateOperation);
    } else {
      await updateOperation();
    }

    return { valid: Object.keys(errors).length === 0, errors };
  }

  /**
   * Reset a setting to its default value
   */
  async resetSetting(key: string): Promise<void> {
    if (!settingsRegistry.has(key)) {
      throw new Error(`Unknown setting: ${key}`);
    }

    const defaultValue = settingsRegistry.getDefaultValue(key);
    await this.updateSetting(key, defaultValue);
  }

  /**
   * Reset all settings in a category
   */
  async resetCategory(category: SettingCategory): Promise<void> {
    const definitions = settingsRegistry.getByCategory(category);
    const settings: Record<string, unknown> = {};

    // Build defaults object
    for (const definition of definitions) {
      settings[definition.key] = settingsRegistry.getDefaultValue(definition.key);
    }

    // Update with defaults
    await this.updateSettings(settings, { transaction: true });
  }

  /**
   * Export settings to JSON
   */
  async exportSettings(options: SettingsQueryOptions = {}): Promise<Record<string, unknown>> {
    return this.getAllSettings(options);
  }

  /**
   * Import settings from JSON
   */
  async importSettings(
    settings: Record<string, unknown>,
    options: BulkUpdateOptions = {}
  ): Promise<ValidationResult> {
    return this.updateSettings(settings, options);
  }

  /**
   * Get public settings only
   */
  async getPublicSettings(): Promise<Record<string, unknown>> {
    return this.getAllSettings({ isPublic: true });
  }

  /**
   * Get settings by category
   */
  async getSettingsByCategory(category: SettingCategory): Promise<Record<string, unknown>> {
    return this.getAllSettings({ category });
  }

  /**
   * Check if setting exists
   */
  async settingExists(key: string): Promise<boolean> {
    if (!settingsRegistry.has(key)) {
      return false;
    }

    const dbSetting = await db.query.systemSettings.findFirst({
      where: eq(systemSettings.key, key)
    });

    return !!dbSetting;
  }

  /**
   * Delete a setting completely
   */
  async deleteSetting(key: string): Promise<void> {
    if (!settingsRegistry.has(key)) {
      throw new Error(`Unknown setting: ${key}`);
    }

    await db.delete(systemSettings).where(eq(systemSettings.key, key));
  }
}

// Export singleton instance
export const settingsService = new SettingsService();