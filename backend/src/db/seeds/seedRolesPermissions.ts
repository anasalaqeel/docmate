import db from "../index";
import rolesPermissionsConfig from "../../../config/rolesPermissions.json";
import { roles, permissions, rolePermissions } from "../schema";
import { eq, inArray } from "drizzle-orm";

async function seedRolesPermissions() {
  try {
    // Prepare unique permissions data for bulk insert
    const uniquePermissions = new Map<string, { name: string; description: string }>();
    rolesPermissionsConfig.forEach((role) => {
      role.permissions.forEach((perm) => {
        uniquePermissions.set(perm.name, {
          name: perm.name,
          description: perm.description,
        });
      });
    });

    // Bulk insert permissions
    const insertedPermissions = await db
      .insert(permissions)
      .values([...uniquePermissions.values()])
      .onConflictDoNothing()
      .returning();

    // Get existing permissions that weren't inserted
    const existingPermissions = await db
      .select()
      .from(permissions)
      .where(inArray(permissions.name, Array.from(uniquePermissions.keys())));

    // Combine inserted and existing permissions into a map
    const permissionMap = new Map<string, number>();
    const allPermissions = [
      ...(Array.isArray(insertedPermissions) ? insertedPermissions : []),
      ...existingPermissions,
    ];

    allPermissions.forEach((perm) => {
      permissionMap.set(perm.name, perm.id);
    });

    // Bulk insert roles
    const roleValues = rolesPermissionsConfig.map((role) => ({
      name: role.name,
      description: role.description,
    }));

    const insertedRoles = await db
      .insert(roles)
      .values(roleValues)
      .onConflictDoNothing()
      .returning();

    // Get existing roles that weren't inserted
    const existingRoles = await db
      .select()
      .from(roles)
      .where(
        inArray(
          roles.name,
          rolesPermissionsConfig.map((r) => r.name)
        )
      );

    // Combine inserted and existing roles into a map
    const roleMap = new Map<string, number>();
    const allRoles = [...(Array.isArray(insertedRoles) ? insertedRoles : []), ...existingRoles];

    allRoles.forEach((role) => {
      roleMap.set(role.name, role.id);
    });

    // Prepare role-permissions pairs for bulk insert
    const rolePermissionsValues = rolesPermissionsConfig.flatMap((role) =>
      role.permissions.map((perm) => ({
        roleId: roleMap.get(role.name)!,
        permissionId: permissionMap.get(perm.name)!,
      }))
    );

    // Bulk insert role-permissions
    await db.insert(rolePermissions).values(rolePermissionsValues).onConflictDoNothing();

    console.log("Roles and permissions seeded successfully");
  } catch (error) {
    console.error("Error seeding roles and permissions:", error);
    throw error;
  }
}

export default seedRolesPermissions;
