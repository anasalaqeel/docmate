import db from "../index";
import { systemSettings } from "../schema";
import { DEFAULT_SETTINGS, getSettingCategory } from "../../config/defaultSettings";
import { eq } from "drizzle-orm";

export async function seedDefaultSettings() {
  console.log("Seeding default settings...");

  try {
    // Insert or update all default settings
    for (const [key, settingDef] of Object.entries(DEFAULT_SETTINGS)) {
      const existing = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, key))
        .limit(1);

      if (existing.length > 0) {
        // Update existing setting
        await db
          .update(systemSettings)
          .set({
            value: settingDef.defaultValue,
            isPublic: settingDef.isPublic,
            description: settingDef.description || existing[0].description,
            updatedAt: new Date(),
          })
          .where(eq(systemSettings.key, key));
      } else {
        // Insert new setting
        await db.insert(systemSettings).values({
          key,
          value: settingDef.defaultValue,
          category: getSettingCategory(key) || "general",
          isPublic: settingDef.isPublic,
          description: settingDef.description,
          updatedAt: new Date(),
        });
      }
    }

    console.log(`Seeded ${Object.keys(DEFAULT_SETTINGS).length} default settings`);

  } catch (error) {
    console.error("Failed to seed default settings:", error);
    throw error;
  }
}