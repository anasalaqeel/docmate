import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authorize } from "../middlewares/authorize";
import { sanitizeObject, sanitizeInput } from "../utils/sanitize";
import {
  uploadRateLimit,
  uploadSecurityMiddleware,
  fileValidationMiddleware,
  uploadErrorCleanup,
} from "../middlewares/uploadSecurity";
import type { BunFileUpload } from "../services/fileUploadService";
import { fileUploadService } from "../services/fileUploadService";
import { ZodError } from "zod";
import { formatZodError } from "../utils/errors";
import { settingsService } from "../services/settingsService";
import { settingsRegistry } from "../config/settings.registry";

const router = new Hono();

// Validation schemas
const updateSettingSchema = z.object({
  value: z.unknown(),
});

const bulkUpdateSchema = z.union([
  z.object({
    settings: z.record(z.string(), z.unknown()),
  }),
  z.record(z.string(), z.unknown()),
]);

const importSettingsSchema = z.object({
  settings: z.record(z.string(), z.unknown()),
});

const validateSettingSchema = z.object({
  key: z.string(),
  value: z.unknown(),
});

// GET /settings/public - Get all public settings (no auth required)
router.get("/public", async (c) => {
  try {
    const publicSettings = await settingsService.getPublicSettings();

    // Convert to array format consistent with /all
    const settingsArray = Object.entries(publicSettings).map(([key, value]) => {
      const definition = settingsRegistry.get(key);
      return {
        key,
        value,
        category: definition?.category || "general",
        description: definition?.description,
        isPublic: true,
        updatedAt: new Date(),
      };
    });

    // Sort by key
    settingsArray.sort((a, b) => a.key.localeCompare(b.key));

    return c.json({
      success: true,
      data: settingsArray,
      message: "Public settings retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting public settings:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to retrieve public settings";
    return c.json({ success: false, message: errorMessage }, 500);
  }
});

// POST /settings/validate - Validate a setting without saving
router.post(
  "/validate",
  authorize(["settings:manage"]),
  zValidator("json", validateSettingSchema),
  async (c) => {
    try {
      const { key, value } = sanitizeObject(c.req.valid("json"));

      // Use the existing validation logic from settingsRegistry
      const validation = settingsRegistry.validate(key, value);

      return c.json({
        success: validation.valid,
        message: validation.valid ? "Valid" : validation.error || "Invalid value",
        data: {
          key,
          value,
          isValid: validation.valid,
          error: validation.error,
        },
      });
    } catch (error) {
      console.error("Error validating setting:", error);
      if (error instanceof ZodError) {
        return c.json(formatZodError(error), 400);
      }
      const errorMessage = error instanceof Error ? error.message : "Validation failed";
      return c.json({ success: false, message: errorMessage }, 500);
    }
  }
);

// GET /settings - Get all settings with pagination
router.get("/", authorize(["settings:manage"]), async (c) => {
  try {
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "50");
    const search = c.req.query("search") || undefined;
    const category = c.req.query("category") || undefined;
    const sortBy = c.req.query("sortBy") || "key";
    const sortOrder = c.req.query("sortOrder") || "asc";

    const sanitizedSearch = search ? sanitizeInput(search, "search") : undefined;

    // Get all settings from the service
    const allSettings = await settingsService.getAllSettings({
      category: category as any,
      includePrivate: true,
    });

    // Convert to array for pagination and filtering
    let settingsArray = Object.entries(allSettings).map(([key, value]) => {
      const definition = settingsRegistry.get(key);
      return {
        key,
        value,
        category: definition?.category || "general",
        description: definition?.description,
        isPublic: definition?.isPublic || false,
        updatedAt: new Date(), // We don't track this in the registry yet
      };
    });

    // Apply search filter
    if (sanitizedSearch) {
      settingsArray = settingsArray.filter((setting) =>
        setting.key.toLowerCase().includes(sanitizedSearch.toLowerCase())
      );
    }

    // Apply category filter
    if (category) {
      settingsArray = settingsArray.filter((setting) => setting.category === category);
    }

    // Sort
    settingsArray.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "key":
          aValue = a.key;
          bValue = b.key;
          break;
        case "category":
          aValue = a.category;
          bValue = b.category;
          break;
        case "updatedAt":
          aValue = a.updatedAt;
          bValue = b.updatedAt;
          break;
        default:
          aValue = a.key;
          bValue = b.key;
      }

      if (sortOrder === "desc") {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      } else {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      }
    });

    // Apply pagination
    const total = settingsArray.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedSettings = settingsArray.slice(offset, offset + limit);

    return c.json({
      success: true,
      data: {
        settings: paginatedSettings,
        total,
        page,
        limit,
        totalPages,
      },
      message: "Settings retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting settings:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to retrieve settings";
    return c.json({ success: false, message: errorMessage }, 500);
  }
});

// GET /settings/all - Get all settings without pagination (for dropdowns)
router.get("/all", authorize(["settings:manage"]), async (c) => {
  try {
    const allSettings = await settingsService.getAllSettings({
      includePrivate: true,
    });

    // Convert to array format
    const settingsArray = Object.entries(allSettings).map(([key, value]) => {
      const definition = settingsRegistry.get(key);
      return {
        key,
        value,
        category: definition?.category || "general",
        description: definition?.description,
        isPublic: definition?.isPublic || false,
        updatedAt: new Date(),
      };
    });

    // Sort by key
    settingsArray.sort((a, b) => a.key.localeCompare(b.key));

    return c.json({
      success: true,
      data: settingsArray,
      message: "All settings retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting all settings:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to retrieve all settings";
    return c.json({ success: false, message: errorMessage }, 500);
  }
});

// GET /settings/:key - Get specific setting
router.get("/:key", authorize(["settings:manage"]), async (c) => {
  try {
    const key = sanitizeInput(c.req.param("key"), "param");

    const value = await settingsService.getSetting(key);
    const definition = settingsRegistry.get(key);

    if (!definition) {
      return c.json({ success: false, message: "Setting not found" }, 404);
    }

    return c.json({
      success: true,
      data: {
        key,
        value,
        category: definition.category,
        description: definition.description,
        isPublic: definition.isPublic || false,
        updatedAt: new Date(),
      },
      message: "Setting retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting setting:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to retrieve setting";
    return c.json({ success: false, message: errorMessage }, 500);
  }
});

// PATCH /settings/bulk - Update multiple settings in a transaction (partial update)
router.patch(
  "/bulk",
  authorize(["settings:manage"]),
  zValidator("json", bulkUpdateSchema),
  async (c) => {
    try {
      const requestBody = c.req.valid("json");
      console.log("Raw request body:", JSON.stringify(requestBody, null, 2));

      const sanitizedBody = sanitizeObject(requestBody);
      console.log("Sanitized body:", JSON.stringify(sanitizedBody, null, 2));

      // Extract settings from payload (supports both { settings: {...} } and direct { ... })
      const settings = (sanitizedBody as any).settings || sanitizedBody;
      console.log("Extracted settings:", JSON.stringify(settings, null, 2));

      // Use the service to update settings
      const result = await settingsService.updateSettings(settings, {
        validateAll: true,
        stopOnFirstError: false,
        transaction: true,
      });

      if (!result.valid) {
        return c.json(
          {
            success: false,
            message: "Validation failed",
            errors: result.errors,
          },
          400
        );
      }

      // Convert to array format using the input values (since they were successfully updated)
      const settingsArray = Object.entries(settings).map(([key, value]) => {
        const definition = settingsRegistry.get(key);
        return {
          key,
          value,
          category: definition?.category || "general",
          description: definition?.description,
          isPublic: definition?.isPublic || false,
          updatedAt: new Date(),
        };
      });

      return c.json({
        success: true,
        data: settingsArray,
        message: "Settings updated successfully",
      });
    } catch (error) {
      console.error("Error updating multiple settings:", error);
      if (error instanceof ZodError) {
        return c.json(formatZodError(error), 400);
      }
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update multiple settings";
      return c.json({ success: false, message: errorMessage }, 500);
    }
  }
);

// PATCH /settings/:key - Update specific setting (partial update)
router.patch(
  "/:key",
  authorize(["settings:manage"]),
  zValidator("json", updateSettingSchema),
  async (c) => {
    try {
      const key = sanitizeInput(c.req.param("key"), "param");
      const { value } = sanitizeObject(c.req.valid("json"));

      await settingsService.updateSetting(key, value);

      const definition = settingsRegistry.get(key);
      const updatedValue = await settingsService.getSetting(key);

      return c.json({
        success: true,
        data: {
          key,
          value: updatedValue,
          category: definition?.category || "general",
          description: definition?.description,
          isPublic: definition?.isPublic || false,
          updatedAt: new Date(),
        },
        message: "Setting updated successfully",
      });
    } catch (error) {
      console.error("Error updating setting:", error);
      if (error instanceof ZodError) {
        return c.json(formatZodError(error), 400);
      }
      const errorMessage = error instanceof Error ? error.message : "Failed to update setting";
      return c.json({ success: false, message: errorMessage }, 500);
    }
  }
);

// DELETE /settings/:key - Reset specific setting
router.delete("/:key", authorize(["settings:manage"]), async (c) => {
  try {
    const key = sanitizeInput(c.req.param("key"), "param");

    await settingsService.resetSetting(key);

    return c.json({
      success: true,
      message: "Setting reset to default successfully",
    });
  } catch (error) {
    console.error("Error resetting setting:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to reset setting";
    return c.json({ success: false, message: errorMessage }, 500);
  }
});

// DELETE /settings/category/:category - Reset entire category
router.delete("/category/:category", authorize(["settings:manage"]), async (c) => {
  try {
    const category = sanitizeInput(c.req.param("category"), "param") as any;

    await settingsService.resetCategory(category);

    return c.json({
      success: true,
      message: `Category ${category} reset to defaults successfully`,
    });
  } catch (error) {
    console.error("Error resetting category settings:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to reset category settings";
    return c.json({ success: false, message: errorMessage }, 500);
  }
});

// GET /settings/export - Export all settings
router.get("/export", authorize(["settings:manage"]), async (c) => {
  try {
    const settings = await settingsService.exportSettings({
      includePrivate: true,
    });

    return c.json({
      success: true,
      data: settings,
      message: "Settings exported successfully",
    });
  } catch (error) {
    console.error("Error exporting settings:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to export settings";
    return c.json({ success: false, message: errorMessage }, 500);
  }
});

// POST /settings/import - Import settings
router.post(
  "/import",
  authorize(["settings:manage"]),
  zValidator("json", importSettingsSchema),
  async (c) => {
    try {
      const { settings } = sanitizeObject(c.req.valid("json"));

      const result = await settingsService.importSettings(settings as Record<string, unknown>, {
        validateAll: true,
        stopOnFirstError: false,
        transaction: true,
      });

      if (!result.valid) {
        return c.json(
          {
            success: false,
            message: "Import validation failed",
            errors: result.errors,
          },
          400
        );
      }

      // Get all current settings after import
      const currentSettings = await settingsService.getAllSettings({
        includePrivate: true,
      });

      return c.json({
        success: true,
        data: {
          current: currentSettings,
          importCount: Object.keys(settings).length,
        },
        message: "Settings imported successfully",
      });
    } catch (error) {
      console.error("Error importing settings:", error);
      if (error instanceof ZodError) {
        return c.json(formatZodError(error), 400);
      }
      const errorMessage = error instanceof Error ? error.message : "Failed to import settings";
      return c.json({ success: false, message: errorMessage }, 500);
    }
  }
);

// POST /settings/upload - Secure file upload (logo, favicon, etc.)
router.post(
  "/upload",
  authorize(["settings:manage"]),
  uploadRateLimit,
  uploadSecurityMiddleware,
  fileValidationMiddleware,
  uploadErrorCleanup,
  async (c) => {
    try {
      const file = c.get("validatedFile") as File;
      const uploadType = c.get("uploadType") as string;

      // Validate upload type against whitelist
      const validTypes = ["logo", "favicon", "custom_asset"];
      if (!validTypes.includes(uploadType)) {
        return c.json(
          {
            success: false,
            message: `Invalid upload type. Must be one of: ${validTypes.join(", ")}`,
          },
          400
        );
      }

      // Convert File to BunFileUpload interface
      const bunFile: BunFileUpload = {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified || Date.now(),
        arrayBuffer: async () => await file.arrayBuffer(),
        stream: () => file.stream(),
        text: async () => await file.text(),
      };

      // Use secure Bun.js native upload service
      const uploadResult = await fileUploadService.uploadFile(bunFile, uploadType);

      return c.json({
        success: true,
        data: {
          path: uploadResult.webPath,
          filename: uploadResult.filename,
          originalName: uploadResult.originalName,
          size: uploadResult.size,
          mimeType: uploadResult.mimeType,
          checksum: uploadResult.checksum,
          fileId: uploadResult.fileId,
        },
        message: "File uploaded successfully",
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      const errorMessage = error instanceof Error ? error.message : "File upload failed";
      return c.json(
        {
          success: false,
          message: errorMessage,
        },
        500
      );
    }
  }
);

export default router;