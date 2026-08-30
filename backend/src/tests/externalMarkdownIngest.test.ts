import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import db from "../db";
import { users, documentations, sidebarItems } from "../db/schema";
import { eq } from "drizzle-orm";
import app from "../app";

describe("POST /v1/external-docs/ingest-markdown", () => {
  let testUser: any;
  let testDoc: any;
  const token = "test-ingest-token-" + Date.now();

  beforeAll(async () => {
    const [usr] = await db
      .insert(users)
      .values({
        name: "Ingest Tester",
        username: "ingest_" + Date.now(),
        email: `ingest_${Date.now()}@test.com`,
        password: "TestPassword123!",
      })
      .returning();
    testUser = usr;

    const [doc] = await db
      .insert(documentations)
      .values({
        title: "Ingest Target",
        version: "1.0.0",
        type: "traditional",
        isPublic: false,
        ingestionToken: token,
        ingestionEnabled: true,
        createdBy: testUser.id,
      })
      .returning();
    testDoc = doc;
  });

  afterAll(async () => {
    if (testDoc) await db.delete(documentations).where(eq(documentations.id, testDoc.id));
    if (testUser) await db.delete(users).where(eq(users.id, testUser.id));
  });

  test("rejects requests without a bearer token", async () => {
    const res = await app.request("/v1/external-docs/ingest-markdown", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files: [{ path: "1-intro.md", content: "# Intro" }] }),
    });
    expect(res.status).toBe(401);
  });

  test("rejects an invalid token", async () => {
    const res = await app.request("/v1/external-docs/ingest-markdown", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer not-a-real-token" },
      body: JSON.stringify({ files: [{ path: "1-intro.md", content: "# Intro" }] }),
    });
    expect(res.status).toBe(401);
  });

  test("ingests numbered markdown files into the sidebar in order", async () => {
    const res = await app.request("/v1/external-docs/ingest-markdown", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        files: [
          { path: "2-authentication.md", content: "# Auth\n\nUse a bearer token." },
          { path: "1-getting-started.md", content: "# Welcome\n\nStart here." },
        ],
        version: "2.0.0",
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.createdItems).toBe(2);

    const items = await db.query.sidebarItems.findMany({
      where: eq(sidebarItems.documentationId, testDoc.id),
    });
    const sorted = items.sort((a, b) => a.order - b.order);
    expect(sorted.map((i) => i.title)).toEqual(["Getting Started", "Authentication"]);

    const updatedDoc = await db.query.documentations.findFirst({
      where: eq(documentations.id, testDoc.id),
    });
    expect(updatedDoc?.version).toBe("2.0.0");
  });

  test("replaces previous content on a second ingest", async () => {
    const res = await app.request("/v1/external-docs/ingest-markdown", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        files: [{ path: "1-only-page.md", content: "# Only page" }],
      }),
    });

    expect(res.status).toBe(200);

    const items = await db.query.sidebarItems.findMany({
      where: eq(sidebarItems.documentationId, testDoc.id),
    });
    expect(items.length).toBe(1);
    expect(items[0].title).toBe("Only Page");
  });

  test("rejects a payload with no markdown files", async () => {
    const res = await app.request("/v1/external-docs/ingest-markdown", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ files: [{ path: "readme.txt", content: "not markdown" }] }),
    });

    expect(res.status).toBe(400);
  });
});
