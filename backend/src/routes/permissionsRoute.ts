import { Hono } from "hono";
import { authorize } from "../middlewares/authorize";
import db from "../db";
import { permissions } from "../db/schema";
import { asc, count, ilike, eq } from "drizzle-orm";

const router = new Hono();

// Get all permissions (admin only)
router.get("/all", authorize(["roles:manage"]), async (c) => {
  try {
    const permissionsResult = await db
      .select()
      .from(permissions)
      .orderBy(asc(permissions.name));

    return c.json({
      success: true,
      data: permissionsResult,
      message: "Permissions retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting permissions:", error);
    return c.json({ message: "Internal server error" }, 500);
  }
});

// Get permissions with pagination (admin only)
router.get("/", authorize(["roles:manage"]), async (c) => {
  try {
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "10");
    const search = c.req.query("search") || undefined;

    const offset = (page - 1) * limit;

    // Build the query following Drizzle documentation patterns
    const permissionsResult = await db
      .select()
      .from(permissions)
      .where(search ? ilike(permissions.name, `%${search}%`) : undefined)
      .orderBy(asc(permissions.name))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const totalResult = await db
      .select({ count: count() })
      .from(permissions)
      .where(search ? ilike(permissions.name, `%${search}%`) : undefined);
    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    return c.json({
      success: true,
      permissions: permissionsResult,
      total,
      page,
      limit,
      totalPages,
      message: "Permissions retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting permissions:", error);
    return c.json({ message: "Internal server error" }, 500);
  }
});

// Get permission by ID (admin only)
router.get("/:id", authorize(["roles:manage"]), async (c) => {
  try {
    const id = parseInt(c.req.param("id"));

    if (isNaN(id)) {
      return c.json({ message: "Invalid permission ID" }, 400);
    }

    const permission = await db.query.permissions.findFirst({
      where: eq(permissions.id, id),
    });

    if (!permission) {
      return c.json({ message: "Permission not found" }, 404);
    }

    return c.json({
      success: true,
      data: permission,
      message: "Permission retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting permission:", error);
    return c.json({ message: "Internal server error" }, 500);
  }
});

export default router;