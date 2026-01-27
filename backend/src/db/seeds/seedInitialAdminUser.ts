import { users, userRoles, roles } from "../schema";
import db from "../index";
import { eq, and } from "drizzle-orm";
import config from "config";

async function seedAdminUser() {
  try {
    // Get the admin role id
    const adminRole = await db.query.roles.findFirst({
      where: eq(roles.name, "admin"),
    });

    if (!adminRole) {
      throw new Error("Admin role not found. Please run seedRolesPermissions first.");
    }

    const adminEmail = config.has("seedAdmin.user") ? config.get<string>("seedAdmin.user") : undefined;
    const adminPassword = config.has("seedAdmin.password") ? config.get<string>("seedAdmin.password") : undefined;

    if (!adminEmail || !adminPassword) {
      throw new Error("SEED_ADMIN_USER and SEED_ADMIN_PASSWORD environment variables are required for initial seeding.");
    }

    // Check if admin user already exists
    const existingAdmin = await db.query.users.findFirst({
      where: eq(users.email, adminEmail),
    });

    let adminUserId: number;

    if (existingAdmin) {
      console.log("Admin user exists, checking role assignment");
      adminUserId = existingAdmin.id;
    } else {
      // Create admin user with hashed password using Bun
      const hashedPassword = await Bun.password.hash(adminPassword);
      const [adminUser] = await db
        .insert(users)
        .values({
          name: "Admin",
          email: adminEmail,
          password: hashedPassword,
        })
        .returning();
      adminUserId = adminUser.id;
      console.log("Admin user created successfully");
    }

    // Check if admin role is already assigned
    const existingRole = await db.query.userRoles.findFirst({
      where: and(eq(userRoles.userId, adminUserId), eq(userRoles.roleId, adminRole.id)),
    });

    if (!existingRole) {
      // Assign admin role to user if not already assigned
      await db
        .insert(userRoles)
        .values({
          userId: adminUserId,
          roleId: adminRole.id,
        })
        .onConflictDoNothing();
      console.log("Admin role assigned successfully");
    } else {
      console.log("Admin role already assigned");
    }
  } catch (error) {
    console.error("Error seeding admin user:", error);
    throw error;
  }
}

export default seedAdminUser;
