import seedRolesPermissions from "./seeds/seedRolesPermissions";
import seedAdminUser from "./seeds/seedInitialAdminUser";
import { seedDefaultSettings } from "./seeds/seedDefaultSettings";

async function main() {
  try {
    console.log("Starting database seeding...");

    // First seed roles and permissions
    console.log("Seeding roles and permissions...");
    await seedRolesPermissions();

    // Then seed admin user
    console.log("Seeding admin user...");
    await seedAdminUser();

    // Finally seed default settings
    console.log("Seeding default settings...");
    await seedDefaultSettings();

    console.log("Database seeding completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
}

main();
