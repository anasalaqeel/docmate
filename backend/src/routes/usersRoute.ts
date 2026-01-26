import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { authorize } from "../middlewares/authorize";
import db from "../db";
import { users, userRoles } from "../db/schema";
import { eq, desc, asc, or, ilike, count, inArray, and } from "drizzle-orm";
import { ZodError } from "zod";
import { formatZodError } from "../utils/errors";
import { sanitizeObject, sanitizeInput } from "../utils/sanitize";
import {
  adminCreateUserSchema,
  adminUpdateUserSchema,
  usersQuerySchema,
  assignRolesSchema,
  changePasswordSchema,
  adminResetPasswordSchema,
} from "../schemas/users";

const router = new Hono();

// Get all users (admin only)
router.get(
  "/",
  authorize(["admin", "superadmin"]),
  zValidator("query", usersQuerySchema),
  async (c) => {
    try {
      const { page, limit, search, sortBy, sortOrder, roleIds, status } = c.req.valid("query");
      const sanitizedSearch = search ? sanitizeInput(search, 'search') : undefined;
      const offset = (page - 1) * limit;

      // Build the query following Drizzle documentation patterns
      const usersResult = await db.query.users.findMany({
        where: (users) => {
          const conditions = [];

          // Apply search filter (using sanitized search)
          if (sanitizedSearch) {
            conditions.push(
              or(
                ilike(users.name, `%${sanitizedSearch}%`),
                ilike(users.email, `%${sanitizedSearch}%`),
                ilike(users.phone, `%${sanitizedSearch}%`)
              )
            );
          }

          // Apply status filter
          if (status) {
            conditions.push(eq(users.status, status));
          }

          return conditions.length > 0 ? and(...conditions) : undefined;
        },
        with: {
          userRoles: {
            with: {
              role: true,
            },
          },
        },
        orderBy: [
          sortBy === "name"
            ? sortOrder === "asc"
              ? asc(users.name)
              : desc(users.name)
            : sortBy === "email"
            ? sortOrder === "asc"
              ? asc(users.email)
              : desc(users.email)
            : sortBy === "updatedAt"
            ? sortOrder === "asc"
              ? asc(users.updatedAt)
              : desc(users.updatedAt)
            : desc(users.createdAt),
        ],
        limit,
        offset,
      });

      // Apply role filter if provided (post-filter)
      let filteredUsers = usersResult;
      if (roleIds && roleIds.length > 0) {
        filteredUsers = usersResult.filter(user =>
          user.userRoles.some(userRole => roleIds.includes(userRole.roleId))
        );
      }

      // Get total count (consider all filters)
      const total = filteredUsers.length;

      return c.json({
        success: true,
        data: {
          users: filteredUsers,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
        message: "Users retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting users:", error);
      return c.json({ message: "Internal server error" }, 500);
    }
  }
);

// Get user by ID (admin only)
router.get("/:id", authorize(["admin", "superadmin"]), async (c) => {
  try {
    const userId = parseInt(c.req.param("id"));
    if (isNaN(userId)) {
      return c.json({ message: "Invalid user ID" }, 400);
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        userRoles: {
          with: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      return c.json({ message: "User not found" }, 404);
    }

    return c.json({
      success: true,
      data: user,
      message: "User retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting user:", error);
    return c.json({ message: "Internal server error" }, 500);
  }
});

// Create user (admin only)
router.post(
  "/",
  authorize(["admin", "superadmin"]),
  zValidator("json", adminCreateUserSchema),
  async (c) => {
    try {
      const userData = sanitizeObject(c.req.valid("json"));

      // Check if user already exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, userData.email),
      });

      if (existingUser) {
        return c.json({ message: "User with this email already exists" }, 409);
      }

      // Hash password
      const hashedPassword = await Bun.password.hash(userData.password);

      // Create user with roles
      const newUser = await db.transaction(async (tx) => {
        const [user] = await tx
          .insert(users)
          .values({
            name: userData.name,
            email: userData.email,
            password: hashedPassword,
            phone: userData.phone || null,
            status: userData.status || "active",
          })
          .returning();

        // Assign roles if provided
        if (userData.roleIds && userData.roleIds.length > 0) {
          await tx.insert(userRoles).values(
            userData.roleIds.map((roleId: number) => ({
              userId: user.id,
              roleId,
            }))
          );
        }

        return user;
      });

      // Return user with roles
      const userWithRoles = await db.query.users.findFirst({
        where: eq(users.id, newUser.id),
        with: {
          userRoles: {
            with: {
              role: true,
            },
          },
        },
      });

      return c.json({
        success: true,
        data: userWithRoles,
        message: "User created successfully",
      });
    } catch (error) {
      console.error("Error creating user:", error);
      if (error instanceof ZodError) {
        return c.json(formatZodError(error), 400);
      }
      return c.json({ message: "Failed to create user" }, 500);
    }
  }
);

// Update user (admin only)
router.put(
  "/:id",
  authorize(["admin", "superadmin"]),
  zValidator("json", adminUpdateUserSchema),
  async (c) => {
    try {
      const userId = parseInt(c.req.param("id"));
      const userData = sanitizeObject(c.req.valid("json"));

      if (isNaN(userId)) {
        return c.json({ message: "Invalid user ID" }, 400);
      }

      // Check if user exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!existingUser) {
        return c.json({ message: "User not found" }, 404);
      }

      // Check email uniqueness if updating email
      if (userData.email && userData.email !== existingUser.email) {
        const emailUser = await db.query.users.findFirst({
          where: eq(users.email, userData.email),
        });

        if (emailUser) {
          return c.json({ message: "Email already exists" }, 409);
        }
      }

      // Update user with roles
      await db.transaction(async (tx) => {
        const updateData: any = {};
        if (userData.name !== undefined) updateData.name = userData.name;
        if (userData.email !== undefined) updateData.email = userData.email;
        if (userData.phone !== undefined) updateData.phone = userData.phone || null;
        if (userData.status !== undefined) updateData.status = userData.status;
        if (userData.password !== undefined) {
          updateData.password = await Bun.password.hash(userData.password);
        }

        if (Object.keys(updateData).length > 0) {
          await tx.update(users).set(updateData).where(eq(users.id, userId));
        }

        // Update roles if provided
        if (userData.roleIds !== undefined) {
          // Remove existing roles
          await tx.delete(userRoles).where(eq(userRoles.userId, userId));

          // Add new roles if any
          if (userData.roleIds.length > 0) {
            await tx.insert(userRoles).values(
              userData.roleIds.map((roleId: number) => ({
                userId,
                roleId,
              }))
            );
          }
        }
      });

      // Return updated user with roles
      const userWithRoles = await db.query.users.findFirst({
        where: eq(users.id, userId),
        with: {
          userRoles: {
            with: {
              role: true,
            },
          },
        },
      });

      return c.json({
        success: true,
        data: userWithRoles,
        message: "User updated successfully",
      });
    } catch (error) {
      console.error("Error updating user:", error);
      if (error instanceof ZodError) {
        return c.json(formatZodError(error), 400);
      }
      return c.json({ message: "Failed to update user" }, 500);
    }
  }
);

// Delete user (admin only)
router.delete("/:id", authorize(["admin", "superadmin"]), async (c) => {
  try {
    const userId = parseInt(c.req.param("id"));

    if (isNaN(userId)) {
      return c.json({ message: "Invalid user ID" }, 400);
    }

    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!existingUser) {
      return c.json({ message: "User not found" }, 404);
    }

    // Delete user (user_roles will be deleted due to cascade)
    await db.delete(users).where(eq(users.id, userId));

    return c.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return c.json({ message: "Failed to delete user" }, 500);
  }
});

// Assign roles to user (admin only)
router.post(
  "/:id/roles",
  authorize(["admin", "superadmin"]),
  zValidator("json", assignRolesSchema),
  async (c) => {
    try {
      const userId = parseInt(c.req.param("id"));
      const { roleIds } = sanitizeObject(c.req.valid("json"));

      if (isNaN(userId)) {
        return c.json({ message: "Invalid user ID" }, 400);
      }

      // Check if user exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!existingUser) {
        return c.json({ message: "User not found" }, 404);
      }

      // Update user roles
      await db.transaction(async (tx) => {
        // Remove existing roles
        await tx.delete(userRoles).where(eq(userRoles.userId, userId));

        // Add new roles
        await tx.insert(userRoles).values(
          roleIds.map((roleId: number) => ({
            userId,
            roleId,
          }))
        );
      });

      // Return updated user with roles
      const userWithRoles = await db.query.users.findFirst({
        where: eq(users.id, userId),
        with: {
          userRoles: {
            with: {
              role: true,
            },
          },
        },
      });

      return c.json({
        success: true,
        data: userWithRoles,
        message: "Roles assigned successfully",
      });
    } catch (error) {
      console.error("Error assigning roles:", error);
      if (error instanceof ZodError) {
        return c.json(formatZodError(error), 400);
      }
      return c.json({ message: "Failed to assign roles" }, 500);
    }
  }
);

// Remove role from user (admin only)
router.delete("/:id/roles/:roleId", authorize(["admin", "superadmin"]), async (c) => {
  try {
    const userId = parseInt(c.req.param("id"));
    const roleId = parseInt(c.req.param("roleId"));

    if (isNaN(userId) || isNaN(roleId)) {
      return c.json({ message: "Invalid user ID or role ID" }, 400);
    }

    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!existingUser) {
      return c.json({ message: "User not found" }, 404);
    }

    // Remove specific role from user
    await db.delete(userRoles).where(eq(userRoles.userId, userId) && eq(userRoles.roleId, roleId));

    return c.json({
      success: true,
      message: "Role removed successfully",
    });
  } catch (error) {
    console.error("Error removing role:", error);
    return c.json({ message: "Failed to remove role" }, 500);
  }
});

// Change user password (admin only)
router.post(
  "/:id/change-password",
  authorize(["admin", "superadmin"]),
  zValidator("json", adminResetPasswordSchema),
  async (c) => {
    try {
      const userId = parseInt(c.req.param("id"));
      const { newPassword } = sanitizeObject(c.req.valid("json"));

      if (isNaN(userId)) {
        return c.json({ message: "Invalid user ID" }, 400);
      }

      // Check if user exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { id: true },
      });

      if (!existingUser) {
        return c.json({ message: "User not found" }, 404);
      }

      // Hash new password and update
      const hashedPassword = await Bun.password.hash(newPassword);
      await db.update(users).set({ password: hashedPassword }).where(eq(users.id, userId));

      return c.json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      console.error("Error changing password:", error);
      if (error instanceof ZodError) {
        return c.json(formatZodError(error), 400);
      }
      return c.json({ message: "Failed to change password" }, 500);
    }
  }
);


export default router;
