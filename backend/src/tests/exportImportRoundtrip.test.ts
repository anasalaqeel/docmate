import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import db from "../db";
import { users, documentations, sidebarItems, pages } from "../db/schema";
import { eq } from "drizzle-orm";
import exportService from "../services/export.service";
import importService from "../services/import.service";

describe("Markdown export/import round trip", () => {
  let testUser: any;
  let sourceDoc: any;
  let targetDocId: number | undefined;

  beforeAll(async () => {
    const [usr] = await db
      .insert(users)
      .values({
        name: "Roundtrip Tester",
        username: "roundtrip_" + Date.now(),
        email: `roundtrip_${Date.now()}@test.com`,
        password: "TestPassword123!",
      })
      .returning();
    testUser = usr;

    const [doc] = await db
      .insert(documentations)
      .values({
        title: "Roundtrip Source",
        version: "1.0.0",
        type: "traditional",
        isPublic: false,
        createdBy: testUser.id,
      })
      .returning();
    sourceDoc = doc;

    // Deliberately non-contiguous `order` values to prove the round trip
    // doesn't depend on DB order already being 1, 2, 3, ...
    const [introItem] = await db
      .insert(sidebarItems)
      .values({
        documentationId: sourceDoc.id,
        title: "Getting Started",
        type: "page",
        order: 10,
      })
      .returning();
    await db.insert(pages).values({
      sidebarItemId: introItem.id,
      slug: "getting-started",
      content: { description: "# Welcome\n\nStart here." },
    });

    const [apiFolder] = await db
      .insert(sidebarItems)
      .values({
        documentationId: sourceDoc.id,
        title: "API",
        type: "folder",
        order: 20,
      })
      .returning();

    const [authItem] = await db
      .insert(sidebarItems)
      .values({
        documentationId: sourceDoc.id,
        parentId: apiFolder.id,
        title: "Authentication",
        type: "page",
        order: 5,
      })
      .returning();
    await db.insert(pages).values({
      sidebarItemId: authItem.id,
      slug: "authentication",
      content: { description: "# Auth\n\nUse a bearer token." },
    });
  });

  afterAll(async () => {
    if (sourceDoc) await db.delete(documentations).where(eq(documentations.id, sourceDoc.id));
    if (targetDocId) await db.delete(documentations).where(eq(documentations.id, targetDocId));
    if (testUser) await db.delete(users).where(eq(users.id, testUser.id));
  });

  test("preserves order and nesting through export -> import", async () => {
    const zipBuffer = await exportService.createMarkdownZip(sourceDoc.id);

    const { document } = await importService.importFromZip(zipBuffer, testUser.id);
    targetDocId = document.id;

    const importedItems = await db.query.sidebarItems.findMany({
      where: eq(sidebarItems.documentationId, targetDocId),
    });

    const root = importedItems
      .filter((i) => i.parentId === null)
      .sort((a, b) => a.order - b.order);
    expect(root.map((i) => i.title)).toEqual(["Getting Started", "Api"]);

    const apiFolderImported = root.find((i) => i.title === "Api")!;
    const apiChildren = importedItems
      .filter((i) => i.parentId === apiFolderImported.id)
      .sort((a, b) => a.order - b.order);
    expect(apiChildren.map((i) => i.title)).toEqual(["Authentication"]);
  });
});
