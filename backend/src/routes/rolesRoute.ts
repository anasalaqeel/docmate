import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { authorize } from "../middlewares/authorize";
import { sanitizeInput } from "../utils/sanitize";
import db from "../db";
import { roles, permissions, rolePermissions, userRoles } from "../db/schema";
import { eq, desc, asc, ilike, count, inArray } from "drizzle-orm";

const router = new Hono();

// Get all roles with pagination (admin only)
router.get("/", authorize(["roles:manage"]), async (c) => {
  try {
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "10");
    const search = c.req.query("search") || undefined;
    const sanitizedSearch = search ? sanitizeInput(search, 'search') : undefined;
    const sortBy = c.req.query("sortBy") || "name";
    const sortOrder = c.req.query("sortOrder") || "asc";

    const offset = (page - 1) * limit;

    // Build the query following Drizzle documentation patterns
    const rolesData = await db
      .select()
      .from(roles)
      .where(sanitizedSearch ? ilike(roles.name, `%${sanitizedSearch}%`) : undefined)
      .orderBy(
        sortBy === "name"
          ? sortOrder === "desc"
            ? desc(roles.name)
            : asc(roles.name)
          : sortBy === "id"
          ? sortOrder === "desc"
            ? desc(roles.id)
            : asc(roles.id)
          : sortBy === "createdAt"
          ? sortOrder === "desc"
            ? desc(roles.createdAt)
            : asc(roles.createdAt)
          : asc(roles.name)
      )
      .limit(limit)
      .offset(offset);

    // Get role permissions for these roles
    const roleIds = rolesData.map(role => role.id);
    const permissionsData = roleIds.length > 0 ? await db
      .select({
        roleId: rolePermissions.roleId,
        permissionId: rolePermissions.permissionId,
        rolePermissionId: rolePermissions.id,
        permissionName: permissions.name,
        permissionDescription: permissions.description
      })
      .from(rolePermissions)
      .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(inArray(rolePermissions.roleId, roleIds)) : [];

    // Combine the data
    const finalRolesResult = rolesData.map(role => ({
      ...role,
      rolePermissions: permissionsData
        .filter(rp => rp.roleId === role.id)
        .map(rp => ({
          id: rp.rolePermissionId,
          roleId: rp.roleId,
          permissionId: rp.permissionId,
          permission: rp.permissionName ? {
            id: rp.permissionId,
            name: rp.permissionName,
            description: rp.permissionDescription
          } : null
        }))
        .filter(rp => rp.permission !== null)
    }));

    // Get total count for pagination
    const totalResult = await db
      .select({ count: count() })
      .from(roles)
      .where(sanitizedSearch ? ilike(roles.name, `%${sanitizedSearch}%`) : undefined);
    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    return c.json({
      success: true,
      roles: finalRolesResult,
      total,
      page,
      limit,
      totalPages,
      message: "Roles retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting roles:", error);
    return c.json({ message: "Internal server error" }, 500);
  }
});

// Get all roles without pagination (admin only) - for dropdowns
router.get("/all", authorize(["roles:manage"]), async (c) => {
  try {
    // Get all roles
    const rolesData = await db
      .select()
      .from(roles)
      .orderBy(asc(roles.name));

    // Get all role permissions
    const permissionsData = await db
      .select({
        roleId: rolePermissions.roleId,
        permissionId: rolePermissions.permissionId,
        rolePermissionId: rolePermissions.id,
        permissionName: permissions.name,
        permissionDescription: permissions.description
      })
      .from(rolePermissions)
      .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id));

    // Combine the data
    const finalRolesResult = rolesData.map(role => ({
      ...role,
      rolePermissions: permissionsData
        .filter(rp => rp.roleId === role.id)
        .map(rp => ({
          id: rp.rolePermissionId,
          roleId: rp.roleId,
          permissionId: rp.permissionId,
          permission: rp.permissionName ? {
            id: rp.permissionId,
            name: rp.permissionName,
            description: rp.permissionDescription
          } : null
        }))
        .filter(rp => rp.permission !== null)
    }));

    return c.json({
      success: true,
      data: finalRolesResult,
      message: "Roles retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting all roles:", error);
    return c.json({ message: "Internal server error" }, 500);
  }
});

// Get role by ID (admin only)
router.get("/:id", authorize(["roles:manage"]), async (c) => {
  try {
    const id = parseInt(c.req.param("id"));

    if (isNaN(id)) {
      return c.json({ message: "Invalid role ID" }, 400);
    }

    const role = await db.query.roles.findFirst({
      where: eq(roles.id, id),
      with: {
        rolePermissions: {
          with: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      return c.json({ message: "Role not found" }, 404);
    }

    return c.json({
      success: true,
      data: role,
      message: "Role retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting role:", error);
    return c.json({ message: "Internal server error" }, 500);
  }
});

// Create role (admin only)
router.post("/", authorize(["roles:manage"]), async (c) => {
  try {
    const body = await c.req.json();
    const { name, description, permissionIds } = body;

    if (!name || name.trim() === '') {
      return c.json({ message: "Role name is required" }, 400);
    }

    // Check if role already exists
    const existingRole = await db.query.roles.findFirst({
      where: eq(roles.name, name.trim()),
    });

    if (existingRole) {
      return c.json({ message: "Role with this name already exists" }, 400);
    }

    // Create the role
    const newRole = await db.insert(roles).values({
      name: name.trim(),
      description: description?.trim() || null,
    }).returning();

    // Assign permissions if provided
    if (permissionIds && Array.isArray(permissionIds) && permissionIds.length > 0) {
      const rolePermissionValues = permissionIds.map((permissionId: number) => ({
        roleId: newRole[0].id,
        permissionId: parseInt(permissionId.toString()),
      }));

      await db.insert(rolePermissions).values(rolePermissionValues);
    }

    return c.json({
      success: true,
      data: newRole[0],
      message: "Role created successfully",
    });
  } catch (error) {
    console.error("Error creating role:", error);
    return c.json({ message: "Internal server error" }, 500);
  }
});

// Update role (admin only)
router.put("/:id", authorize(["roles:manage"]), async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const { name, description, permissionIds } = body;

    if (isNaN(id)) {
      return c.json({ message: "Invalid role ID" }, 400);
    }

    if (!name || name.trim() === '') {
      return c.json({ message: "Role name is required" }, 400);
    }

    // Check if role exists
    const existingRole = await db.query.roles.findFirst({
      where: eq(roles.id, id),
    });

    if (!existingRole) {
      return c.json({ message: "Role not found" }, 404);
    }

    // Check if name conflicts with another role
    const nameConflict = await db.query.roles.findFirst({
      where: eq(roles.name, name.trim()),
    });

    if (nameConflict && nameConflict.id !== id) {
      return c.json({ message: "Role with this name already exists" }, 400);
    }

    // Update the role
    const updatedRole = await db.update(roles)
      .set({
        name: name.trim(),
        description: description?.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(roles.id, id))
      .returning();

    // Update permissions if provided
    if (permissionIds !== undefined) {
      // Delete existing role-permission relationships
      await db.delete(rolePermissions).where(eq(rolePermissions.roleId, id));

      // Add new role-permission relationships
      if (Array.isArray(permissionIds) && permissionIds.length > 0) {
        const rolePermissionValues = permissionIds.map((permissionId: number) => ({
          roleId: id,
          permissionId: parseInt(permissionId.toString()),
        }));

        await db.insert(rolePermissions).values(rolePermissionValues);
      }
    }

    return c.json({
      success: true,
      data: updatedRole[0],
      message: "Role updated successfully",
    });
  } catch (error) {
    console.error("Error updating role:", error);
    return c.json({ message: "Internal server error" }, 500);
  }
});

// Delete role (admin only)
router.delete("/:id", authorize(["roles:manage"]), async (c) => {
  try {
    const id = parseInt(c.req.param("id"));

    if (isNaN(id)) {
      return c.json({ message: "Invalid role ID" }, 400);
    }

    // Check if role exists
    const existingRole = await db.query.roles.findFirst({
      where: eq(roles.id, id),
    });

    if (!existingRole) {
      return c.json({ message: "Role not found" }, 404);
    }

    // Delete role-permission relationships first
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, id));

    // Delete user-role relationships
    await db.delete(userRoles).where(eq(userRoles.roleId, id));

    // Delete the role
    await db.delete(roles).where(eq(roles.id, id));

    return c.json({
      success: true,
      message: "Role deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting role:", error);
    return c.json({ message: "Internal server error" }, 500);
  }
});

export default router;