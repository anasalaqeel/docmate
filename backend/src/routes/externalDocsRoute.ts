import { Hono } from "hono";
import { eq } from "drizzle-orm";
import db from "../db";
import { documentations, sidebarItems, openApiSpecs, users } from "../db/schema";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

type Variables = {
  documentation: typeof documentations.$inferSelect;
};

const externalDocs = new Hono<{ Variables: Variables }>();

// Schema for ingestion payload
const ingestionSchema = z.object({
  serviceName: z.string().optional(), // Optional, title comes from doc
  spec: z.any(),
  version: z.string().optional(),
  isPublic: z.boolean().optional(),
});

// Middleware to check for the ingestion token
externalDocs.use("/ingest", async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized: Missing Bearer token" }, 401);
  }

  const token = authHeader.split(" ")[1];
  
  // Find documentation with this token
  const doc = await db.query.documentations.findFirst({
    where: eq(documentations.ingestionToken, token),
  });

  if (!doc) {
    return c.json({ error: "Unauthorized: Invalid token" }, 401);
  }

  if (!doc.ingestionEnabled) {
    return c.json({ error: "Forbidden: Ingestion is disabled for this documentation" }, 403);
  }

  // Attach doc to context for next handler
  c.set("documentation", doc);

  await next();
});

externalDocs.post("/ingest", zValidator("json", ingestionSchema), async (c) => {
  try {
    const body = c.req.valid("json");
    const { spec, version, isPublic } = body;
    const doc = c.get("documentation"); // Set by middleware

    if (!spec) {
      return c.json({ error: "Missing required fields: spec" }, 400);
    }

    const docId = doc.id;

    // 1. Update Documentation Metadata
    await db
      .update(documentations)
      .set({
        version: version || doc.version,
        updatedAt: new Date(),
        isPublic: isPublic !== undefined ? isPublic : doc.isPublic,
      })
      .where(eq(documentations.id, docId));

    // 2. Upsert OpenAPI Spec
    const existingSpecs = await db
      .select()
      .from(openApiSpecs)
      .where(eq(openApiSpecs.documentationId, docId));

    if (existingSpecs.length > 0) {
        await db.update(openApiSpecs).set({
            specVersion: spec.openapi || "3.0.0",
            info: spec.info || {},
            servers: spec.servers,
            paths: spec.paths,
            components: spec.components,
            security: spec.security,
            tags: spec.tags,
            externalDocs: spec.externalDocs,
            rawSpec: spec,
            updatedAt: new Date()
        }).where(eq(openApiSpecs.id, existingSpecs[0].id));
    } else {
         await db.insert(openApiSpecs).values({
            documentationId: docId,
            specVersion: spec.openapi || "3.0.0",
            info: spec.info || {},
            servers: spec.servers,
            paths: spec.paths,
            components: spec.components,
            security: spec.security,
            tags: spec.tags,
            externalDocs: spec.externalDocs,
            rawSpec: spec,
        });
    }

    return c.json({ success: true, docId, message: "Documentation updated successfully" });
  } catch (error) {
    console.error("Ingestion error:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

export default externalDocs;
