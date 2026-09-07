import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { sign } from "hono/jwt";
import { eq } from "drizzle-orm";
import config from "config";
import db from "../db";
import app from "../app";
import {
  users,
  sessions,
  roles,
  permissions,
  rolePermissions,
  userRoles,
  documentations,
  sidebarItems,
  pages,
  uploads,
} from "../db/schema";
import versionService from "../services/version.service";

describe("Documentation versions", () => {
  let testUser: any;
  let testSession: any;
  let cookie: string;
  let testDoc: any;
  let introItem: any;
  let introPage: any;
  let folderItem: any;
  const ingestionToken = "versions-test-" + Date.now();

  beforeAll(async () => {
    // Admin user with the real docs permissions linked through role_permissions
    const [adminRole] = await db
      .insert(roles)
      .values({ name: "admin", description: "Administrator" })
      .onConflictDoNothing()
      .returning();
    const role =
      adminRole ?? (await db.query.roles.findFirst({ where: eq(roles.name, "admin") }))!;

    const permissionNames = ["docs:read", "docs:update", "docs:delete"];
    for (const name of permissionNames) {
      const [perm] = await db
        .insert(permissions)
        .values({ name, description: `Test ${name}` })
        .onConflictDoNothing()
        .returning();
      const p =
        perm ?? (await db.query.permissions.findFirst({ where: eq(permissions.name, name) }))!;
      await db
        .insert(rolePermissions)
        .values({ roleId: role.id, permissionId: p.id })
        .onConflictDoNothing();
    }

    const [usr] = await db
      .insert(users)
      .values({
        name: "Versions Tester",
        username: "versions_" + Date.now(),
        email: `versions_${Date.now()}@test.com`,
        password: "TestPassword123!",
      })
      .returning();
    testUser = usr;
    await db.insert(userRoles).values({ userId: testUser.id, roleId: role.id });

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    const [sess] = await db
      .insert(sessions)
      .values({ userId: testUser.id, expiresAt, isActive: true })
      .returning();
    testSession = sess;
    const token = await sign({ sessionId: testSession.id }, config.get("authTokenSecret")!);
    cookie = `sessionToken=${token}`;

    // Public doc with a folder + two pages, one attachment on the intro page
    const [doc] = await db
      .insert(documentations)
      .values({
        title: "Versions Test Doc",
        version: "0.9.0",
        type: "traditional",
        isPublic: true,
        ingestionToken,
        ingestionEnabled: true,
        createdBy: testUser.id,
      })
      .returning();
    testDoc = doc;

    [introItem] = await db
      .insert(sidebarItems)
      .values({ documentationId: testDoc.id, title: "Getting Started", type: "page", order: 5 })
      .returning();
    [introPage] = await db
      .insert(pages)
      .values({
        sidebarItemId: introItem.id,
        slug: "getting-started",
        content: { description: "# Welcome\n\nOriginal v1 content." },
      })
      .returning();

    [folderItem] = await db
      .insert(sidebarItems)
      .values({ documentationId: testDoc.id, title: "API", type: "folder", order: 10 })
      .returning();
    const [authItem] = await db
      .insert(sidebarItems)
      .values({
        documentationId: testDoc.id,
        parentId: folderItem.id,
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

    await db.insert(uploads).values({
      type: "custom_asset",
      filename: "test-asset.png",
      originalName: "test-asset.png",
      mimeType: "image/png",
      size: 100,
      path: "/uploads/test-asset.png",
      documentationId: testDoc.id,
      pageId: introPage.id,
      uploadedBy: testUser.id,
    });
  });

  afterAll(async () => {
    if (testDoc) await db.delete(documentations).where(eq(documentations.id, testDoc.id));
    if (testSession) await db.delete(sessions).where(eq(sessions.id, testSession.id));
    if (testUser) {
      await db.delete(userRoles).where(eq(userRoles.userId, testUser.id));
      await db.delete(users).where(eq(users.id, testUser.id));
    }
  });

  test("cutting a version snapshots content and syncs the label when default", async () => {
    const summary = await versionService.createVersion(testDoc.id, {
      version: "1.0.0",
      changelog: "First release",
      isDefault: true,
      createdBy: testUser.id,
    });

    expect(summary.version).toBe("1.0.0");
    expect(summary.isDefault).toBe(true);
    expect(summary.isBackup).toBe(false);

    const doc = await db.query.documentations.findFirst({
      where: eq(documentations.id, testDoc.id),
    });
    expect(doc?.version).toBe("1.0.0");
  });

  test("rejects duplicate labels, reserved labels and invalid labels", async () => {
    await expect(
      versionService.createVersion(testDoc.id, { version: "1.0.0" })
    ).rejects.toMatchObject({ status: 409 });

    await expect(
      versionService.createVersion(testDoc.id, { version: "next" })
    ).rejects.toMatchObject({ status: 400 });

    await expect(
      versionService.createVersion(testDoc.id, { version: "has space" })
    ).rejects.toMatchObject({ status: 400 });
  });

  test("admin endpoints require authentication", async () => {
    const res = await app.request(`/v1/docs/${testDoc.id}/versions`, { method: "GET" });
    expect(res.status).toBe(401);
  });

  test("plain public URL serves the default snapshot, versions/next serves live", async () => {
    // Diverge the live content after the cut
    await db
      .update(pages)
      .set({ content: { description: "# Welcome\n\nEdited after the cut." } })
      .where(eq(pages.id, introPage.id));
    const [extraItem] = await db
      .insert(sidebarItems)
      .values({ documentationId: testDoc.id, title: "Changelog", type: "page", order: 20 })
      .returning();
    await db.insert(pages).values({
      sidebarItemId: extraItem.id,
      slug: "changelog",
      content: { description: "# Changelog\n\nNew page." },
    });

    // Plain URL: default snapshot — original content, no Changelog page
    const stable = await (
      await app.request(`/v1/docs/public/${testDoc.id}`)
    ).json();
    expect(stable.success).toBe(true);
    expect(stable.data.viewedVersion.version).toBe("1.0.0");
    expect(stable.data.viewedVersion.isDefault).toBe(true);
    const flatTitles = JSON.stringify(stable.data.sidebarItems);
    expect(flatTitles).toContain("Getting Started");
    expect(flatTitles).not.toContain("Changelog");
    const stableIntro = stable.data.sidebarItems
      .find((i: any) => i.title === "Getting Started")
      ?.page?.content?.description;
    expect(stableIntro).toContain("Original v1 content.");

    // Explicit version URL matches the snapshot
    const v1 = await (
      await app.request(`/v1/docs/public/${testDoc.id}/versions/1.0.0`)
    ).json();
    expect(v1.data.viewedVersion.version).toBe("1.0.0");
    expect(JSON.stringify(v1.data.sidebarItems)).not.toContain("Changelog");

    // next serves the live draft
    const next = await (
      await app.request(`/v1/docs/public/${testDoc.id}/versions/next`)
    ).json();
    expect(next.data.viewedVersion).toBeNull();
    expect(JSON.stringify(next.data.sidebarItems)).toContain("Changelog");
    const nextIntro = next.data.sidebarItems
      .find((i: any) => i.title === "Getting Started")
      ?.page?.content?.description;
    expect(nextIntro).toContain("Edited after the cut.");

    // unknown version 404s
    const missing = await app.request(`/v1/docs/public/${testDoc.id}/versions/9.9.9`);
    expect(missing.status).toBe(404);

    // dropdown list
    const list = await (await app.request(`/v1/docs/public/${testDoc.id}/versions`)).json();
    expect(list.data.map((v: any) => v.version)).toEqual(["1.0.0"]);
    expect(list.data[0].isDefault).toBe(true);
  });

  test("setting a new default demotes the old one and clears fall back to live", async () => {
    await versionService.createVersion(testDoc.id, {
      version: "2.0.0",
      changelog: "Second release",
    });

    // Look up the id of 2.0.0 through the admin list
    const listRes = await app.request(`/v1/docs/${testDoc.id}/versions`, {
      method: "GET",
      headers: { Cookie: cookie },
    });
    const list = await listRes.json();
    const v2 = list.data.find((v: any) => v.version === "2.0.0");
    const v1 = list.data.find((v: any) => v.version === "1.0.0");

    const setDefault = await app.request(`/v1/docs/${testDoc.id}/versions/${v2.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ isDefault: true }),
    });
    expect(setDefault.status).toBe(200);

    const versionsAfter = await (await app.request(`/v1/docs/public/${testDoc.id}/versions`)).json();
    const defaults = versionsAfter.data.filter((v: any) => v.isDefault);
    expect(defaults.map((d: any) => d.version)).toEqual(["2.0.0"]);

    const doc = await db.query.documentations.findFirst({
      where: eq(documentations.id, testDoc.id),
    });
    expect(doc?.version).toBe("2.0.0");

    // Plain URL now serves 2.0.0 (with the Changelog page)
    const stable = await (await app.request(`/v1/docs/public/${testDoc.id}`)).json();
    expect(stable.data.viewedVersion.version).toBe("2.0.0");
    expect(JSON.stringify(stable.data.sidebarItems)).toContain("Changelog");

    // Clearing the default falls back to live content
    const clear = await app.request(`/v1/docs/${testDoc.id}/versions/${v2.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ isDefault: false }),
    });
    expect(clear.status).toBe(200);

    const live = await (await app.request(`/v1/docs/public/${testDoc.id}`)).json();
    expect(live.data.viewedVersion).toBeNull();
    expect(JSON.stringify(live.data.sidebarItems)).toContain("Changelog");

    // restore 1.0.0 as default for the fork test
    await app.request(`/v1/docs/${testDoc.id}/versions/${v1.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ isDefault: true }),
    });
  });

  test("default flag validation: unknown versions 404 without side effects, backups rejected", async () => {
    // Demoting an unknown version must fail AND must not clear the real default
    const before = await versionService.listVersions(testDoc.id, false);
    const res = await app.request(`/v1/docs/${testDoc.id}/versions/999999`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ isDefault: false }),
    });
    expect(res.status).toBe(404);
    const after = await versionService.listVersions(testDoc.id, false);
    expect(after.find((v) => v.isDefault)?.version).toBe(
      before.find((v) => v.isDefault)?.version
    );

    // Automatic backups can never become the stable default
    const backup = await versionService.createVersion(testDoc.id, {
      version: "backup-manual-test",
      isBackup: true,
    });
    const setRes = await app.request(`/v1/docs/${testDoc.id}/versions/${backup.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ isDefault: true }),
    });
    expect(setRes.status).toBe(400);
  });

  test("forking a version restores content with IDs preserved and attachments intact", async () => {
    const listRes = await app.request(`/v1/docs/${testDoc.id}/versions`, {
      method: "GET",
      headers: { Cookie: cookie },
    });
    const list = await listRes.json();
    const v1 = list.data.find((v: any) => v.version === "1.0.0");

    const fork = await app.request(`/v1/docs/${testDoc.id}/versions/${v1.id}/fork`, {
      method: "POST",
      headers: { Cookie: cookie },
    });
    expect(fork.status).toBe(200);
    const body = await fork.json();
    expect(body.success).toBe(true);
    expect(body.data.restoredItems).toBe(3);

    // Live tree matches the snapshot: original content, Changelog gone
    const liveItems = await db.query.sidebarItems.findMany({
      where: eq(sidebarItems.documentationId, testDoc.id),
    });
    expect(liveItems.map((i) => i.title).sort()).toEqual(["API", "Authentication", "Getting Started"]);

    const introAfter = await db.query.pages.findFirst({ where: eq(pages.id, introPage.id) });
    expect(introAfter?.id).toBe(introPage.id); // ID preserved
    expect((introAfter?.content as { description?: string } | undefined)?.description).toContain(
      "Original v1 content."
    );

    // Attachment row survived the fork (uploads cascade-delete with pages)
    const upload = await db.query.uploads.findFirst({
      where: eq(uploads.pageId, introPage.id),
    });
    expect(upload).not.toBeNull();

    // Sequences were bumped: creating a new page after the fork works
    const [newItem] = await db
      .insert(sidebarItems)
      .values({ documentationId: testDoc.id, title: "After Fork", type: "page", order: 30 })
      .returning();
    const [newPage] = await db
      .insert(pages)
      .values({ sidebarItemId: newItem.id, slug: "after-fork", content: {} })
      .returning();
    expect(newPage.id).toBeGreaterThan(introPage.id);
  });

  test("markdown ingestion creates pruned backups excluded from the public list", async () => {
    for (let i = 0; i < 6; i++) {
      const res = await app.request("/v1/external-docs/ingest-markdown", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${ingestionToken}` },
        body: JSON.stringify({
          files: [{ path: `1-intro.md`, content: `# Intro ${i}\n\nIngested content.` }],
        }),
      });
      expect(res.status).toBe(200);
    }

    const adminList = await (
      await app.request(`/v1/docs/${testDoc.id}/versions`, {
        method: "GET",
        headers: { Cookie: cookie },
      })
    ).json();
    const backups = adminList.data.filter((v: any) => v.isBackup);
    expect(backups.length).toBeLessThanOrEqual(5);
    expect(backups.length).toBeGreaterThan(0);

    const publicList = await (
      await app.request(`/v1/docs/public/${testDoc.id}/versions`)
    ).json();
    expect(publicList.data.every((v: any) => !v.isBackup)).toBe(true);
  });

  test("ingestion publishes new versions, re-cuts corrections, and drafts leave versions untouched", async () => {
    const push = (content: string, extra: Record<string, unknown> = {}) =>
      app.request("/v1/external-docs/ingest-markdown", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${ingestionToken}` },
        body: JSON.stringify({
          files: [{ path: "1-intro.md", content }],
          ...extra,
        }),
      });

    // Release push: new label + default -> readers immediately get 3.0.0
    const release = await push("# Intro\n\nRelease 3.0.0 content.", {
      version: "3.0.0",
      isDefault: true,
      changelog: "CI release",
    });
    expect(release.status).toBe(200);
    const releaseBody = await release.json();
    expect(releaseBody.version).toMatchObject({ version: "3.0.0", isDefault: true });

    const stable = await (await app.request(`/v1/docs/public/${testDoc.id}`)).json();
    expect(stable.data.viewedVersion.version).toBe("3.0.0");
    const doc = await db.query.documentations.findFirst({
      where: eq(documentations.id, testDoc.id),
    });
    expect(doc?.version).toBe("3.0.0");

    // Correction push to the same label: re-cuts the snapshot in place —
    // still a single 3.0.0 row, still the stable default
    const correction = await push("# Intro\n\nRelease 3.0.0 corrected.", { version: "3.0.0" });
    expect(correction.status).toBe(200);
    const releases = (await versionService.listVersions(testDoc.id, false)).filter(
      (v) => v.version === "3.0.0"
    );
    expect(releases.length).toBe(1);
    expect(releases[0].isDefault).toBe(true);

    const v3 = await (await app.request(`/v1/docs/public/${testDoc.id}/versions/3.0.0`)).json();
    expect(JSON.stringify(v3.data.sidebarItems)).toContain("corrected");

    // Draft-only push (no version): live content moves, versions do not
    const before = await versionService.listVersions(testDoc.id, false);
    await push("# Intro\n\nDraft ahead.");
    const after = await versionService.listVersions(testDoc.id, false);
    expect(after.length).toBe(before.length);

    const next = await (await app.request(`/v1/docs/public/${testDoc.id}/versions/next`)).json();
    expect(JSON.stringify(next.data.sidebarItems)).toContain("Draft ahead.");
    const stableAfter = await (await app.request(`/v1/docs/public/${testDoc.id}`)).json();
    expect(JSON.stringify(stableAfter.data.sidebarItems)).toContain("Release 3.0.0 corrected.");
  });

  test("deleting a version removes it and leaves no dangling default", async () => {
    const listRes = await app.request(`/v1/docs/${testDoc.id}/versions`, {
      method: "GET",
      headers: { Cookie: cookie },
    });
    const list = await listRes.json();
    const target = list.data.find((v: any) => v.version === "1.0.0");

    const del = await app.request(`/v1/docs/${testDoc.id}/versions/${target.id}`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
    expect(del.status).toBe(200);

    const remaining = await versionService.listVersions(testDoc.id, true);
    expect(remaining.find((v) => v.version === "1.0.0")).toBeUndefined();

    // The partial unique index still holds: exactly one default at most
    const defaults = remaining.filter((v) => v.isDefault);
    expect(defaults.length).toBeLessThanOrEqual(1);
  });
});
