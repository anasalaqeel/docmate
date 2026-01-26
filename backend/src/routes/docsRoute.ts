import { Hono } from "hono";
import { authorize } from "../middlewares/authorize";
import db from "../db";
import {
  documentations,
  sidebarItems,
  pages,
  openApiSpecs,
  type Documentation,
  type SidebarItem,
  type Page,
  type OpenApiSpec,
} from "../db/schema";
import { eq, and, desc, isNull, isNotNull, inArray } from "drizzle-orm";
import {
  buildHierarchicalTree,
  detectCircularReferences,
  validateMove,
  countDescendants,
  getDescendantIds,
} from "../utils/treeBuilder";
import exportService from "../services/export.service";
import importService from "../services/import.service";

const docsRoute = new Hono();

// Get public documentations (no auth required)
docsRoute.get("/public", async (c) => {
  try {
    const docs = await db.query.documentations.findMany({
      where: eq(documentations.isPublic, true),
      with: {
        creator: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [desc(documentations.updatedAt)],
    });
    return c.json({ success: true, data: docs });
  } catch (error) {
    console.error("Error fetching public documentations:", error);
    return c.json({ success: false, message: "Failed to fetch documentations" }, 500);
  }
});

// Get public documentation by ID with full structure
docsRoute.get("/public/:id", async (c) => {
  try {
    const docId = parseInt(c.req.param("id"));

    const doc = await db.query.documentations.findFirst({
      where: and(eq(documentations.id, docId), eq(documentations.isPublic, true)),
      with: {
        creator: {
          columns: {
            id: true,
            name: true,
          },
        },
        sidebarItems: {
          with: {
            page: true,
          },
          orderBy: [sidebarItems.order],
        },
      },
    });

    if (!doc) {
      return c.json({ success: false, message: "Documentation not found or not public" }, 404);
    }

    // Build hierarchical tree from flat array (filters soft-deleted items)
    const hierarchicalTree = buildHierarchicalTree(doc.sidebarItems, 10, true);

    return c.json({
      success: true,
      data: {
        ...doc,
        sidebarItems: hierarchicalTree, // Return tree structure
      },
    });
  } catch (error) {
    console.error("Error fetching public documentation:", error);
    return c.json({ success: false, message: "Failed to fetch documentation" }, 500);
  }
});

// Get public OpenAPI spec
docsRoute.get("/public/:id/openapi", async (c) => {
  try {
    const docId = parseInt(c.req.param("id"));

    // First check if the documentation is public
    const doc = await db.query.documentations.findFirst({
      where: and(eq(documentations.id, docId), eq(documentations.isPublic, true)),
      columns: { id: true, isPublic: true },
    });

    if (!doc) {
      return c.json({ success: false, message: "Documentation not found or not public" }, 404);
    }

    const spec = await db.query.openApiSpecs.findFirst({
      where: eq(openApiSpecs.documentationId, docId),
      orderBy: [desc(openApiSpecs.updatedAt)],
    });

    if (!spec) {
      return c.json({ success: false, message: "OpenAPI spec not found" }, 404);
    }

    return c.json({ success: true, data: spec });
  } catch (error) {
    console.error("Error fetching public OpenAPI spec:", error);
    return c.json({ success: false, message: "Failed to fetch OpenAPI spec" }, 500);
  }
});

// Get all documentations (admin only)
docsRoute.get("/", authorize(["admin", "superadmin", "moderator"]), async (c) => {
  try {
    const docs = await db.query.documentations.findMany({
      with: {
        creator: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [desc(documentations.updatedAt)],
    });
    return c.json({ success: true, data: docs });
  } catch (error) {
    console.error("Error fetching documentations:", error);
    return c.json({ success: false, message: "Failed to fetch documentations" }, 500);
  }
});

// Create new documentation
docsRoute.post("/", authorize(["admin", "superadmin", "moderator"]), async (c) => {
  try {
    const user = c.get("user");
    console.log("User from context:", user);

    if (!user || !user.id) {
      console.error("No user found in context");
      return c.json({ success: false, message: "User not authenticated" }, 401);
    }

    const body = await c.req.json();
    console.log("Request body:", body);

    const { title, description, version, isPublic, type, baseUrl, showApiEndpointsInSidebar } =
      body;

    if (!title?.trim()) {
      return c.json({ success: false, message: "Title is required" }, 400);
    }

    console.log("Creating documentation with:", {
      title: title.trim(),
      description: description || null,
      version: version || "1.0.0",
      isPublic: isPublic || false,
      type: type || "mixed",
      baseUrl: baseUrl || null,
      showApiEndpointsInSidebar:
        showApiEndpointsInSidebar !== undefined ? showApiEndpointsInSidebar : true,
      createdBy: user.id,
    });

    const [newDoc] = await db
      .insert(documentations)
      .values({
        title: title.trim(),
        description: description || null,
        version: version || "1.0.0",
        isPublic: isPublic || false,
        type: type || "mixed",
        baseUrl: baseUrl || null,
        showApiEndpointsInSidebar:
          showApiEndpointsInSidebar !== undefined ? showApiEndpointsInSidebar : true,
        ingestionEnabled: false,
        createdBy: user.id,
      })
      .returning();

    console.log("Documentation created:", newDoc);
    return c.json({ success: true, data: newDoc }, 201);
  } catch (error) {
    console.error("Error creating documentation:", error);
    return c.json({ success: false, message: "Failed to create documentation" }, 500);
  }
});

// Get documentation by ID with sidebar items
docsRoute.get("/:id", authorize(["admin", "superadmin", "moderator"]), async (c) => {
  try {
    const docId = parseInt(c.req.param("id"));

    const doc = await db.query.documentations.findFirst({
      where: eq(documentations.id, docId),
      with: {
        creator: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
        sidebarItems: {
          with: {
            page: true,
          },
          orderBy: [sidebarItems.order],
        },
      },
    });

    if (!doc) {
      return c.json({ success: false, message: "Documentation not found" }, 404);
    }

    // Check for circular references in the data
    if (detectCircularReferences(doc.sidebarItems)) {
      console.error(`Circular reference detected in documentation ${docId}`);
      return c.json(
        { success: false, message: "Data integrity error: circular reference detected" },
        500
      );
    }

    // Build hierarchical tree from flat array (filters soft-deleted items by default)
    const hierarchicalTree = buildHierarchicalTree(doc.sidebarItems, 10, true);

    return c.json({
      success: true,
      data: {
        ...doc,
        sidebarItems: hierarchicalTree, // Return tree structure
        sidebarItemsFlat: doc.sidebarItems, // Keep flat array for backward compatibility
      },
    });
  } catch (error) {
    console.error("Error fetching documentation:", error);
    return c.json({ success: false, message: "Failed to fetch documentation" }, 500);
  }
});

// Update documentation (partial updates)
docsRoute.patch("/:id", authorize(["admin", "superadmin", "moderator"]), async (c) => {
  try {
    const docId = parseInt(c.req.param("id"));
    const updateData = await c.req.json();

    // Build update object only with provided fields
    const updateFields: any = {};

    if (updateData.title !== undefined) {
      if (!updateData.title?.trim()) {
        return c.json({ success: false, message: "Title cannot be empty" }, 400);
      }
      updateFields.title = updateData.title.trim();
    }

    if (updateData.description !== undefined) {
      updateFields.description = updateData.description || null;
    }

    if (updateData.version !== undefined) {
      updateFields.version = updateData.version || "1.0.0";
    }

    if (updateData.isPublic !== undefined) {
      updateFields.isPublic = updateData.isPublic;
    }

    if (updateData.type !== undefined) {
      updateFields.type = updateData.type;
    }

    if (updateData.baseUrl !== undefined) {
      updateFields.baseUrl = updateData.baseUrl || null;
    }

    if (updateData.showApiEndpointsInSidebar !== undefined) {
      updateFields.showApiEndpointsInSidebar = updateData.showApiEndpointsInSidebar;
    }

    if (updateData.ingestionToken !== undefined) {
      updateFields.ingestionToken = updateData.ingestionToken || null;
    }

    if (updateData.ingestionEnabled !== undefined) {
      updateFields.ingestionEnabled = updateData.ingestionEnabled;
    }

    // Only proceed if there are fields to update
    if (Object.keys(updateFields).length === 0) {
      return c.json({ success: false, message: "No fields to update" }, 400);
    }

    const [updatedDoc] = await db
      .update(documentations)
      .set(updateFields)
      .where(eq(documentations.id, docId))
      .returning();

    if (!updatedDoc) {
      return c.json({ success: false, message: "Documentation not found" }, 404);
    }

    return c.json({ success: true, data: updatedDoc });
  } catch (error) {
    console.error("Error updating documentation:", error);
    return c.json({ success: false, message: "Failed to update documentation" }, 500);
  }
});

// Delete documentation
docsRoute.delete("/:id", authorize(["admin", "superadmin"]), async (c) => {
  try {
    const docId = parseInt(c.req.param("id"));

    const [deletedDoc] = await db
      .delete(documentations)
      .where(eq(documentations.id, docId))
      .returning();

    if (!deletedDoc) {
      return c.json({ success: false, message: "Documentation not found" }, 404);
    }

    return c.json({ success: true, message: "Documentation deleted successfully" });
  } catch (error) {
    console.error("Error deleting documentation:", error);
    return c.json({ success: false, message: "Failed to delete documentation" }, 500);
  }
});

// Sidebar Items Routes
docsRoute.post("/:id/sidebar-items", authorize(["admin", "superadmin", "moderator"]), async (c) => {
  try {
    const docId = parseInt(c.req.param("id"));
    const { title, type, parentId, icon, order } = await c.req.json();

    if (!title?.trim() || !type) {
      return c.json({ success: false, message: "Title and type are required" }, 400);
    }

    // Validate parentId if provided
    if (parentId) {
      // Get all sidebar items for validation
      const allItems = await db.query.sidebarItems.findMany({
        where: eq(sidebarItems.documentationId, docId),
      });

      // Note: We can't validate move for a new item that doesn't exist yet
      // But we can validate the parent exists and isn't deleted
      const parent = allItems.find((item) => item.id === parentId);
      if (!parent) {
        return c.json({ success: false, message: "Parent item not found" }, 404);
      }
      if (parent.deletedAt) {
        return c.json({ success: false, message: "Cannot add item to deleted parent" }, 400);
      }
    }

    const [newSidebarItem] = await db
      .insert(sidebarItems)
      .values({
        documentationId: docId,
        title: title.trim(),
        type,
        parentId: parentId || null,
        icon: icon || null,
        order: order || 0,
      })
      .returning();

    // If the sidebar item type is "page", also create a corresponding page
    if (type === "page") {
      // Generate unique slug
      const baseSlug = title.trim().toLowerCase().replace(/\s+/g, "-");
      const timestamp = Date.now();
      const uniqueSlug = `${baseSlug}-${timestamp}`;

      // Check for existing pages with the same slug in this documentation
      const existingPage = await db
        .select({
          id: pages.id,
          slug: pages.slug,
        })
        .from(pages)
        .innerJoin(sidebarItems, eq(pages.sidebarItemId, sidebarItems.id))
        .where(
          and(
            eq(pages.slug, uniqueSlug),
            eq(sidebarItems.documentationId, docId),
            isNull(sidebarItems.deletedAt)
          )
        )
        .limit(1);

      if (existingPage.length > 0) {
        // If somehow there's still a conflict, add another random number
        const fallbackSlug = `${uniqueSlug}-${Math.floor(Math.random() * 1000)}`;

        await db
          .insert(pages)
          .values({
            sidebarItemId: newSidebarItem.id,
            slug: fallbackSlug,
            content: { blocks: [] },
            metadata: {},
          })
          .returning();
      } else {
        await db
          .insert(pages)
          .values({
            sidebarItemId: newSidebarItem.id,
            slug: uniqueSlug,
            content: { blocks: [] },
            metadata: {},
          })
          .returning();
      }
    }

    return c.json({ success: true, data: newSidebarItem }, 201);
  } catch (error) {
    console.error("Error creating sidebar item:", error);

    // Check for specific database constraint violations
    if (error instanceof Error) {
      if (error.message.includes("duplicate key") || error.message.includes("unique constraint")) {
        return c.json(
          {
            success: false,
            message: "An item with this name already exists. Please choose a different name.",
          },
          409
        );
      }

      if (error.message.includes("foreign key constraint")) {
        return c.json(
          {
            success: false,
            message: "Invalid parent item reference.",
          },
          400
        );
      }
    }

    return c.json({ success: false, message: "Failed to create sidebar item" }, 500);
  }
});

// Update sidebar item
docsRoute.put(
  "/:docId/sidebar-items/:itemId",
  authorize(["admin", "superadmin", "moderator"]),
  async (c) => {
    try {
      const docId = parseInt(c.req.param("docId"));
      const itemId = parseInt(c.req.param("itemId"));
      const { title, type, parentId, icon, order, isExpanded } = await c.req.json();

      // Get all sidebar items for validation
      const allItems = await db.query.sidebarItems.findMany({
        where: eq(sidebarItems.documentationId, docId),
      });

      // Validate move if parentId is being changed
      if (parentId !== undefined) {
        const validation = validateMove(itemId, parentId, allItems, 10);
        if (!validation.valid) {
          return c.json({ success: false, message: validation.error }, 400);
        }
      }

      const [updatedItem] = await db
        .update(sidebarItems)
        .set({
          title: title?.trim(),
          type,
          parentId: parentId !== undefined ? parentId || null : undefined,
          icon: icon !== undefined ? icon || null : undefined,
          order,
          isExpanded,
        })
        .where(eq(sidebarItems.id, itemId))
        .returning();

      if (!updatedItem) {
        return c.json({ success: false, message: "Sidebar item not found" }, 404);
      }

      return c.json({ success: true, data: updatedItem });
    } catch (error) {
      console.error("Error updating sidebar item:", error);
      return c.json({ success: false, message: "Failed to update sidebar item" }, 500);
    }
  }
);

// Soft delete sidebar item (move to trash)
docsRoute.delete(
  "/:docId/sidebar-items/:itemId",
  authorize(["admin", "superadmin", "moderator"]),
  async (c) => {
    try {
      const docId = parseInt(c.req.param("docId"));
      const itemId = parseInt(c.req.param("itemId"));
      const user = c.get("user");

      // Get all sidebar items to find descendants
      const allItems = await db.query.sidebarItems.findMany({
        where: eq(sidebarItems.documentationId, docId),
      });

      // Get all descendant IDs (including the item itself)
      const descendantIds = getDescendantIds(itemId, allItems);
      const descendantCount = descendantIds.length;

      // Soft delete the item and all its descendants
      const deletedItems = await db
        .update(sidebarItems)
        .set({
          deletedAt: new Date(),
          deletedBy: user.id,
        })
        .where(inArray(sidebarItems.id, descendantIds))
        .returning();

      if (deletedItems.length === 0) {
        return c.json({ success: false, message: "Sidebar item not found" }, 404);
      }

      return c.json({
        success: true,
        message: `Moved ${deletedItems.length} item${deletedItems.length > 1 ? "s" : ""} to trash`,
        data: {
          deletedItem: deletedItems[0],
          deletedCount: deletedItems.length,
          descendantCount,
        },
      });
    } catch (error) {
      console.error("Error deleting sidebar item:", error);
      return c.json({ success: false, message: "Failed to delete sidebar item" }, 500);
    }
  }
);

// Get trash items for a documentation
docsRoute.get("/:docId/trash", authorize(["admin", "superadmin", "moderator"]), async (c) => {
  try {
    const docId = parseInt(c.req.param("docId"));

    const trashedItems = await db.query.sidebarItems.findMany({
      where: and(
        eq(sidebarItems.documentationId, docId),
        isNotNull(sidebarItems.deletedAt) // Only deleted items
      ),
      with: {
        page: true,
      },
      orderBy: [desc(sidebarItems.deletedAt)],
    });

    // Calculate descendant counts for each item
    const allItems = await db.query.sidebarItems.findMany({
      where: eq(sidebarItems.documentationId, docId),
    });

    const itemsWithCounts = trashedItems.map((item) => ({
      ...item,
      descendantCount: countDescendants(item.id, allItems) - 1, // Subtract 1 to exclude self
    }));

    return c.json({ success: true, data: itemsWithCounts });
  } catch (error) {
    console.error("Error fetching trash:", error);
    return c.json({ success: false, message: "Failed to fetch trash items" }, 500);
  }
});

// Restore item from trash
docsRoute.post(
  "/:docId/sidebar-items/:itemId/restore",
  authorize(["admin", "superadmin", "moderator"]),
  async (c) => {
    try {
      const itemId = parseInt(c.req.param("itemId"));

      // Restore the item (set deletedAt to null, CASCADE will NOT restore children automatically)
      // We need to manually restore all descendants
      const docId = parseInt(c.req.param("docId"));
      const allItems = await db.query.sidebarItems.findMany({
        where: eq(sidebarItems.documentationId, docId),
      });

      const descendantIds = [itemId, ...getDescendantIds(itemId, allItems)];

      // Restore all items in the subtree
      await db
        .update(sidebarItems)
        .set({
          deletedAt: null,
          deletedBy: null,
        })
        .where(and(eq(sidebarItems.documentationId, docId), eq(sidebarItems.id, itemId)));

      // Restore children separately
      if (descendantIds.length > 1) {
        for (const descendantId of descendantIds.slice(1)) {
          await db
            .update(sidebarItems)
            .set({
              deletedAt: null,
              deletedBy: null,
            })
            .where(eq(sidebarItems.id, descendantId));
        }
      }

      return c.json({
        success: true,
        message: `Restored ${descendantIds.length} item(s)`,
        data: { restoredCount: descendantIds.length },
      });
    } catch (error) {
      console.error("Error restoring item:", error);
      return c.json({ success: false, message: "Failed to restore item" }, 500);
    }
  }
);

// Permanent delete from trash
docsRoute.delete(
  "/:docId/sidebar-items/:itemId/permanent",
  authorize(["admin", "superadmin", "moderator"]),
  async (c) => {
    try {
      const itemId = parseInt(c.req.param("itemId"));

      // Check if item is in trash
      const item = await db.query.sidebarItems.findFirst({
        where: eq(sidebarItems.id, itemId),
      });

      if (!item) {
        return c.json({ success: false, message: "Item not found" }, 404);
      }

      if (!item.deletedAt) {
        return c.json(
          { success: false, message: "Item is not in trash. Use regular delete instead." },
          400
        );
      }

      // Permanently delete (CASCADE will handle children)
      const [deletedItem] = await db
        .delete(sidebarItems)
        .where(eq(sidebarItems.id, itemId))
        .returning();

      return c.json({
        success: true,
        message: "Item permanently deleted",
      });
    } catch (error) {
      console.error("Error permanently deleting item:", error);
      return c.json({ success: false, message: "Failed to permanently delete item" }, 500);
    }
  }
);

// Batch reorder sidebar items (for drag-drop)
docsRoute.post(
  "/:docId/sidebar-items/reorder",
  authorize(["admin", "superadmin", "moderator"]),
  async (c) => {
    try {
      const docId = parseInt(c.req.param("docId"));
      const { items } = await c.req.json();

      if (!Array.isArray(items) || items.length === 0) {
        return c.json({ success: false, message: "Items array is required" }, 400);
      }

      // Get all sidebar items for validation
      const allItems = await db.query.sidebarItems.findMany({
        where: eq(sidebarItems.documentationId, docId),
      });

      // Validate all moves before applying
      for (const item of items) {
        if (!item.id || item.order === undefined) {
          return c.json({ success: false, message: "Each item must have id and order" }, 400);
        }

        if (item.parentId !== undefined) {
          const validation = validateMove(item.id, item.parentId, allItems, 10);
          if (!validation.valid) {
            return c.json(
              { success: false, message: `Invalid move for item ${item.id}: ${validation.error}` },
              400
            );
          }
        }
      }

      // Update all items
      const updatedItems = [];
      for (const item of items) {
        const [updated] = await db
          .update(sidebarItems)
          .set({
            order: item.order,
            parentId: item.parentId !== undefined ? item.parentId || null : undefined,
          })
          .where(eq(sidebarItems.id, item.id))
          .returning();

        if (updated) {
          updatedItems.push(updated);
        }
      }

      return c.json({
        success: true,
        message: `Reordered ${updatedItems.length} items`,
        data: updatedItems,
      });
    } catch (error) {
      console.error("Error reordering items:", error);
      return c.json({ success: false, message: "Failed to reorder items" }, 500);
    }
  }
);

// Pages Routes
docsRoute.post(
  "/:docId/sidebar-items/:itemId/page",
  authorize(["admin", "superadmin", "moderator"]),
  async (c) => {
    try {
      const itemId = parseInt(c.req.param("itemId"));
      const { slug, content, metadata } = await c.req.json();

      if (!slug?.trim()) {
        return c.json({ success: false, message: "Slug is required" }, 400);
      }

      const trimmedSlug = slug.trim();

      // Check if sidebar item exists and is not deleted
      const sidebarItem = await db.query.sidebarItems.findFirst({
        where: eq(sidebarItems.id, itemId),
      });

      if (!sidebarItem) {
        return c.json({ success: false, message: "Sidebar item not found" }, 404);
      }

      if (sidebarItem.deletedAt) {
        return c.json(
          { success: false, message: "Cannot create page for deleted sidebar item" },
          400
        );
      }

      // Check for existing page with same slug within the same documentation
      const existingPage = await db
        .select({
          id: pages.id,
          slug: pages.slug,
        })
        .from(pages)
        .innerJoin(sidebarItems, eq(pages.sidebarItemId, sidebarItems.id))
        .where(
          and(
            eq(pages.slug, trimmedSlug),
            eq(sidebarItems.documentationId, sidebarItem.documentationId),
            isNull(sidebarItems.deletedAt)
          )
        )
        .limit(1);

      if (existingPage.length > 0) {
        return c.json(
          {
            success: false,
            message:
              "A page with this name already exists at this level. Please choose a different name.",
          },
          409
        );
      }

      const [newPage] = await db
        .insert(pages)
        .values({
          sidebarItemId: itemId,
          slug: trimmedSlug,
          content: content || null,
          metadata: metadata || null,
        })
        .returning();

      return c.json({ success: true, data: newPage }, 201);
    } catch (error) {
      console.error("Error creating page:", error);

      // Check for specific database constraint violations
      if (error instanceof Error) {
        if (
          error.message.includes("duplicate key") ||
          error.message.includes("unique constraint")
        ) {
          return c.json(
            {
              success: false,
              message: "A page with this name already exists. Please choose a different name.",
            },
            409
          );
        }

        if (error.message.includes("foreign key constraint")) {
          return c.json(
            {
              success: false,
              message: "Invalid sidebar item reference.",
            },
            400
          );
        }
      }

      return c.json({ success: false, message: "Failed to create page" }, 500);
    }
  }
);

// Update page
docsRoute.put("/pages/:pageId", authorize(["admin", "superadmin", "moderator"]), async (c) => {
  try {
    const pageId = parseInt(c.req.param("pageId"));
    const { slug, content, metadata } = await c.req.json();

    const [updatedPage] = await db
      .update(pages)
      .set({
        slug: slug?.trim(),
        content,
        metadata,
      })
      .where(eq(pages.id, pageId))
      .returning();

    if (!updatedPage) {
      return c.json({ success: false, message: "Page not found" }, 404);
    }

    return c.json({ success: true, data: updatedPage });
  } catch (error) {
    console.error("Error updating page:", error);
    return c.json({ success: false, message: "Failed to update page" }, 500);
  }
});

// OpenAPI Routes
docsRoute.post("/:id/openapi", authorize(["admin", "superadmin", "moderator"]), async (c) => {
  try {
    const docId = parseInt(c.req.param("id"));
    const { specVersion, info, servers, paths, components, security, tags, externalDocs, rawSpec } =
      await c.req.json();

    if (!info) {
      return c.json({ success: false, message: "OpenAPI info is required" }, 400);
    }

    const [newSpec] = await db
      .insert(openApiSpecs)
      .values({
        documentationId: docId,
        specVersion: specVersion || "3.1.0",
        info,
        servers: servers || null,
        paths: paths || null,
        components: components || null,
        security: security || null,
        tags: tags || null,
        externalDocs: externalDocs || null,
        rawSpec: rawSpec || null,
      })
      .returning();

    return c.json({ success: true, data: newSpec }, 201);
  } catch (error) {
    console.error("Error creating OpenAPI spec:", error);
    return c.json({ success: false, message: "Failed to create OpenAPI spec" }, 500);
  }
});

// Import OpenAPI specification
docsRoute.post(
  "/:id/openapi/import",
  authorize(["admin", "superadmin", "moderator"]),
  async (c) => {
    try {
      const docId = parseInt(c.req.param("id"));
      const rawSpec = await c.req.json();

      if (!rawSpec.openapi && !rawSpec.swagger) {
        return c.json({ success: false, message: "Invalid OpenAPI/Swagger specification" }, 400);
      }

      // Extract main components
      const info = rawSpec.info || {};
      const servers = rawSpec.servers || [];
      const paths = rawSpec.paths || {};
      const components = rawSpec.components || {};
      const security = rawSpec.security || [];
      const tags = rawSpec.tags || [];
      const externalDocs = rawSpec.externalDocs || null;
      const specVersion = rawSpec.openapi || "2.0";

      const [newSpec] = await db
        .insert(openApiSpecs)
        .values({
          documentationId: docId,
          specVersion,
          info,
          servers,
          paths,
          components,
          security,
          tags,
          externalDocs,
          rawSpec,
        })
        .returning();

      return c.json({ success: true, data: newSpec }, 201);
    } catch (error) {
      console.error("Error importing OpenAPI spec:", error);
      return c.json({ success: false, message: "Failed to import OpenAPI spec" }, 500);
    }
  }
);

// Generate OpenAPI from CRUD operations route removed - use manual OpenAPI spec upload instead

// Get OpenAPI spec
docsRoute.get("/:id/openapi", async (c) => {
  try {
    const docId = parseInt(c.req.param("id"));

    const spec = await db.query.openApiSpecs.findFirst({
      where: eq(openApiSpecs.documentationId, docId),
      orderBy: [desc(openApiSpecs.updatedAt)],
    });

    if (!spec) {
      return c.json({ success: false, message: "OpenAPI spec not found" }, 404);
    }

    return c.json({ success: true, data: spec });
  } catch (error) {
    console.error("Error fetching OpenAPI spec:", error);
    return c.json({ success: false, message: "Failed to fetch OpenAPI spec" }, 500);
  }
});

// Export OpenAPI spec as JSON
docsRoute.get("/:id/openapi/export", async (c) => {
  try {
    const docId = parseInt(c.req.param("id"));

    const spec = await db.query.openApiSpecs.findFirst({
      where: eq(openApiSpecs.documentationId, docId),
      orderBy: [desc(openApiSpecs.updatedAt)],
    });

    if (!spec) {
      return c.json({ success: false, message: "OpenAPI spec not found" }, 404);
    }

    c.header("Content-Disposition", `attachment; filename="openapi-spec-${docId}.json"`);
    c.header("Content-Type", "application/json");

    return c.json(spec.rawSpec);
  } catch (error) {
    console.error("Error exporting OpenAPI spec:", error);
    return c.json({ success: false, message: "Failed to export OpenAPI spec" }, 500);
  }
});

// Delete OpenAPI spec
docsRoute.delete("/:id/openapi", authorize(["admin", "superadmin", "moderator"]), async (c) => {
  try {
    const docId = parseInt(c.req.param("id"));

    const spec = await db.query.openApiSpecs.findFirst({
      where: eq(openApiSpecs.documentationId, docId),
    });

    if (!spec) {
      return c.json({ success: false, message: "OpenAPI spec not found" }, 404);
    }

    await db.delete(openApiSpecs).where(eq(openApiSpecs.documentationId, docId));

    return c.json({ success: true, message: "OpenAPI spec deleted successfully" });
  } catch (error) {
    console.error("Error deleting OpenAPI spec:", error);
    return c.json({ success: false, message: "Failed to delete OpenAPI spec" }, 500);
  }
});

// Export Routes

// Export document as PDF - allows admins, moderators, and users
docsRoute.get(
  "/:id/export/pdf",
  authorize(["admin", "superadmin", "moderator", "user"]),
  async (c) => {
    try {
      const docId = parseInt(c.req.param("id"));

      // Generate PDF
      const pdfBuffer = await exportService.generatePDFExport(docId);

      // Set response headers for file download
      const doc = await db.query.documentations.findFirst({
        where: eq(documentations.id, docId),
        columns: { title: true },
      });

      const fileName = doc
        ? `${doc.title.replace(/[^a-zA-Z0-9\s]/g, "")}.pdf`
        : `document-${docId}.pdf`;
      const sanitizedFileName = fileName.replace(/\s+/g, "-");

      c.header("Content-Disposition", `attachment; filename="${sanitizedFileName}"`);
      c.header("Content-Type", "application/pdf");
      c.header("Content-Length", pdfBuffer.length.toString());

      return new Response(pdfBuffer as any, {
        headers: {
          "Content-Disposition": `attachment; filename="${sanitizedFileName}"`,
          "Content-Type": "application/pdf",
          "Content-Length": pdfBuffer.length.toString(),
        },
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      return c.json({ success: false, message: "Failed to export PDF" }, 500);
    }
  }
);

// Export document as Markdown ZIP - allows admins, moderators, and users
docsRoute.get(
  "/:id/export/markdown",
  authorize(["admin", "superadmin", "moderator", "user"]),
  async (c) => {
    try {
      const docId = parseInt(c.req.param("id"));

      // Generate Markdown ZIP
      const zipBuffer = await exportService.createMarkdownZip(docId);

      // Set response headers for file download
      const doc = await db.query.documentations.findFirst({
        where: eq(documentations.id, docId),
        columns: { title: true },
      });

      const fileName = doc
        ? `${doc.title.replace(/[^a-zA-Z0-9\s]/g, "")}-markdown.zip`
        : `document-${docId}-markdown.zip`;
      const sanitizedFileName = fileName.replace(/\s+/g, "-");

      return new Response(zipBuffer as any, {
        headers: {
          "Content-Disposition": `attachment; filename="${sanitizedFileName}"`,
          "Content-Type": "application/zip",
          "Content-Length": zipBuffer.length.toString(),
        },
      });
    } catch (error) {
      console.error("Error exporting Markdown:", error);
      return c.json({ success: false, message: "Failed to export Markdown" }, 500);
    }
  }
);

// Export document as raw JSON (for developers) - allows admins, moderators, and users
docsRoute.get(
  "/:id/export/json",
  authorize(["admin", "superadmin", "moderator", "user"]),
  async (c) => {
    try {
      const docId = parseInt(c.req.param("id"));

      // Get complete document data
      const document = await exportService.getDocumentForExport(docId);
      if (!document) {
        return c.json({ success: false, message: "Document not found" }, 404);
      }

      // Set response headers for file download
      const doc = await db.query.documentations.findFirst({
        where: eq(documentations.id, docId),
        columns: { title: true },
      });

      const fileName = doc
        ? `${doc.title.replace(/[^a-zA-Z0-9\s]/g, "")}.json`
        : `document-${docId}.json`;
      const sanitizedFileName = fileName.replace(/\s+/g, "-");

      c.header("Content-Disposition", `attachment; filename="${sanitizedFileName}"`);
      c.header("Content-Type", "application/json");

      return c.json({ success: true, data: document });
    } catch (error) {
      console.error("Error exporting JSON:", error);
      return c.json({ success: false, message: "Failed to export JSON" }, 500);
    }
  }
);

// Import Routes

// Import document (create new document)
docsRoute.post("/import", authorize(["admin", "superadmin", "moderator"]), async (c) => {
  try {
    const user = c.get("user");
    const userId = user.id;
    const contentType = c.req.header("content-type");

    if (!contentType || !contentType.includes("multipart/form-data")) {
      return c.json({ success: false, message: "File upload required" }, 400);
    }

    // Parse multipart form data using Hono's built-in parsing
    const body = await c.req.parseBody();
    const file = body.file as File;

    if (!file) {
      return c.json({ success: false, message: "No file provided" }, 400);
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      return c.json({ success: false, message: "File too large (max 50MB)" }, 400);
    }

    // Validate file type
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".zip") && !fileName.endsWith(".json")) {
      return c.json({ success: false, message: "Only ZIP and JSON files are supported" }, 400);
    }

    const fileBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(fileBuffer);

    let result;

    if (fileName.endsWith(".json")) {
      // Import from JSON
      const jsonData = JSON.parse(buffer.toString());
      result = await importService.importFromJson(jsonData, userId);
    } else if (fileName.endsWith(".zip")) {
      // Import from ZIP
      result = await importService.importFromZip(buffer, userId);
    } else {
      return c.json({
        success: false,
        message: "Unsupported file format. Only JSON and ZIP files are supported."
      }, 400);
    }

    if (!result) {
      return c.json({
        success: false,
        message: "Failed to import document"
      }, 500);
    }

    return c.json(
      {
        success: true,
        message: "Document imported successfully",
        data: {
          document: result.document,
          createdItems: result.createdItems,
        },
      },
      201
    );
  } catch (error) {
    console.error("Error importing document:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    // Return specific error messages based on common issues
    if (errorMessage.includes("Invalid JSON format")) {
      return c.json({ success: false, message: "Invalid JSON file format" }, 400);
    } else if (errorMessage.includes("Invalid ZIP file")) {
      return c.json({ success: false, message: "Invalid ZIP file format" }, 400);
    } else if (errorMessage.includes("missing _metadata.json")) {
      return c.json({ success: false, message: "Invalid ZIP file: missing _metadata.json" }, 400);
    } else if (errorMessage.includes("missing _index.md")) {
      return c.json({ success: false, message: "Invalid ZIP file: missing _index.md" }, 400);
    } else if (errorMessage.includes("Document not found")) {
      return c.json({ success: false, message: "Document not found" }, 404);
    } else if (errorMessage.includes("Authentication required")) {
      return c.json({ success: false, message: "Authentication required" }, 401);
    } else if (errorMessage.includes("Insufficient permissions")) {
      return c.json({ success: false, message: "Insufficient permissions" }, 403);
    } else {
      return c.json({ success: false, message: "Failed to import document" }, 500);
    }
  }
});

// Import into existing document
docsRoute.post("/:id/import", authorize(["admin", "superadmin", "moderator"]), async (c) => {
  try {
    const docId = parseInt(c.req.param("id"));
    const user = c.get("user");
    const userId = user.id;
    const contentType = c.req.header("content-type");

    if (!contentType || !contentType.includes("multipart/form-data")) {
      return c.json({ success: false, message: "File upload required" }, 400);
    }

    // Check if document exists and user has permission
    const doc = await db.query.documentations.findFirst({
      where: eq(documentations.id, docId),
    });

    if (!doc) {
      return c.json({ success: false, message: "Document not found" }, 404);
    }

    // Parse multipart form data
    const body = await c.req.parseBody();
    const file = body.file as File;

    if (!file) {
      return c.json({ success: false, message: "No file provided" }, 400);
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      return c.json({ success: false, message: "File too large (max 50MB)" }, 400);
    }

    // Validate file type
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".zip") && !fileName.endsWith(".json")) {
      return c.json({ success: false, message: "Only ZIP and JSON files are supported" }, 400);
    }

    const fileBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(fileBuffer);

    let result;

    if (fileName.endsWith(".json")) {
      // Import from JSON
      const jsonData = JSON.parse(buffer.toString());
      result = await importService.importFromJson(jsonData, userId, docId);
    } else if (fileName.endsWith(".zip")) {
      // Import from ZIP
      result = await importService.importFromZip(buffer, userId, docId);
    } else {
      return c.json({
        success: false,
        message: "Unsupported file format. Only JSON and ZIP files are supported."
      }, 400);
    }

    if (!result) {
      return c.json({
        success: false,
        message: "Failed to import document"
      }, 500);
    }

    return c.json({
      success: true,
      message: "Document imported successfully",
      data: {
        document: result.document,
        createdItems: result.createdItems,
      },
    });
  } catch (error) {
    console.error("Error importing document:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    // Return specific error messages based on common issues
    if (errorMessage.includes("Invalid JSON format")) {
      return c.json({ success: false, message: "Invalid JSON file format" }, 400);
    } else if (errorMessage.includes("Invalid ZIP file")) {
      return c.json({ success: false, message: "Invalid ZIP file format" }, 400);
    } else if (errorMessage.includes("missing _metadata.json")) {
      return c.json({ success: false, message: "Invalid ZIP file: missing _metadata.json" }, 400);
    } else if (errorMessage.includes("missing _index.md")) {
      return c.json({ success: false, message: "Invalid ZIP file: missing _index.md" }, 400);
    } else if (errorMessage.includes("Document not found")) {
      return c.json({ success: false, message: "Document not found" }, 404);
    } else if (errorMessage.includes("Authentication required")) {
      return c.json({ success: false, message: "Authentication required" }, 401);
    } else if (errorMessage.includes("Insufficient permissions")) {
      return c.json({ success: false, message: "Insufficient permissions" }, 403);
    } else {
      return c.json({ success: false, message: "Failed to import document" }, 500);
    }
  }
});

export default docsRoute;
