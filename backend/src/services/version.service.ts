import { and, desc, eq, inArray, isNull, notInArray, sql } from "drizzle-orm";
import db from "../db";
import {
  documentations,
  documentationVersions,
  sidebarItems,
  pages,
  openApiSpecs,
  type Documentation,
  type SidebarItem,
  type Page,
  type OpenApiSpec,
} from "../db/schema";
import { buildHierarchicalTree } from "../utils/treeBuilder";

// Version labels are used in reader URLs (/docs/:id/v/:version), so only
// URL-safe characters are allowed. "next" is reserved for the live draft view.
const VERSION_LABEL_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,49}$/;
const MAX_INGESTION_BACKUPS = 5;

// Drizzle wraps driver errors in DrizzleQueryError with the original Postgres
// error attached as `cause`, so uniqueness must be detected across the chain.
function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  while (current instanceof Error) {
    if ((current as { code?: unknown }).code === "23505") return true;
    if (current.message.includes("duplicate key")) return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

export class VersionError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Snapshot rows are the live DB rows with dates serialized to ISO strings (JSONB).
interface SnapshotPage extends Omit<Page, "createdAt" | "updatedAt"> {
  createdAt: string;
  updatedAt: string;
}

interface SnapshotSidebarItem extends Omit<SidebarItem, "createdAt"> {
  createdAt: string;
  page: SnapshotPage | null;
}

interface VersionSnapshot {
  documentation: Pick<
    Documentation,
    "title" | "description" | "version" | "type" | "baseUrl" | "showApiEndpointsInSidebar"
  >;
  sidebarItems: SnapshotSidebarItem[];
  openApiSpec: Omit<OpenApiSpec, "createdAt" | "updatedAt"> & {
    createdAt: string;
    updatedAt: string;
  } | null;
}

export interface VersionSummary {
  id: number;
  version: string;
  changelog: string | null;
  isDefault: boolean;
  isBackup: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVersionOptions {
  version: string;
  changelog?: string | null;
  isDefault?: boolean;
  isBackup?: boolean;
  createdBy?: number | null;
}

class VersionService {
  /**
   * Freeze the current live content of a documentation into an immutable snapshot.
   */
  async createVersion(
    documentationId: number,
    options: CreateVersionOptions
  ): Promise<VersionSummary> {
    const label = options.version?.trim();
    if (!label || !VERSION_LABEL_PATTERN.test(label)) {
      throw new VersionError(
        "Invalid version label: use 1-50 characters (letters, digits, '.', '_', '-'), starting with a letter or digit",
        400
      );
    }
    if (label.toLowerCase() === "next") {
      throw new VersionError("Version label 'next' is reserved for the live draft view", 400);
    }
    if (options.isDefault && options.isBackup) {
      throw new VersionError("An automatic backup cannot be the stable default", 400);
    }

    const doc = await db.query.documentations.findFirst({
      where: eq(documentations.id, documentationId),
      columns: { id: true },
    });
    if (!doc) {
      throw new VersionError("Documentation not found", 404);
    }

    const snapshot = await this.buildSnapshot(documentationId);

    const created = await db.transaction(async (tx) => {
      if (options.isDefault) {
        await tx
          .update(documentationVersions)
          .set({ isDefault: false })
          .where(eq(documentationVersions.documentationId, documentationId));
      }

      let row;
      try {
        [row] = await tx
          .insert(documentationVersions)
          .values({
            documentationId,
            version: label,
            changelog: options.changelog?.trim() || null,
            snapshot,
            isDefault: options.isDefault ?? false,
            isBackup: options.isBackup ?? false,
            createdBy: options.createdBy ?? null,
          })
          .returning();
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new VersionError(`Version '${label}' already exists`, 409);
        }
        throw error;
      }

      // Keep the reader-facing doc label in sync with the stable default so
      // doc cards and the public list show what /docs/:id actually serves.
      if (options.isDefault) {
        await tx
          .update(documentations)
          .set({ version: label })
          .where(eq(documentations.id, documentationId));
      }

      return row;
    });

    return this.toSummary(created);
  }

  /**
   * Publish the current live content under a label — the entry point for CI
   * ingestion pushes. If the label already exists, its snapshot is re-cut
   * from the freshly ingested content so correction pushes are idempotent;
   * otherwise a new version is created. Pass isDefault to make it the stable
   * version readers get.
   */
  async publishVersion(
    documentationId: number,
    label: string,
    options: {
      isDefault?: boolean;
      changelog?: string | null;
      createdBy?: number | null;
    } = {}
  ): Promise<VersionSummary> {
    const existing = await db.query.documentationVersions.findFirst({
      where: and(
        eq(documentationVersions.documentationId, documentationId),
        eq(documentationVersions.version, label),
        eq(documentationVersions.isBackup, false)
      ),
    });

    if (!existing) {
      return this.createVersion(documentationId, {
        version: label,
        changelog: options.changelog ?? null,
        isDefault: options.isDefault ?? false,
        createdBy: options.createdBy ?? null,
      });
    }

    const updated = await this.recutFromLive(existing, options.changelog);

    if (options.isDefault && !existing.isDefault) {
      await this.setDefault(documentationId, existing.id, true);
    }

    return updated;
  }

  /**
   * Re-cut a version's snapshot from the current live content, optionally
   * updating its changelog (an absent changelog keeps the existing one).
   */
  private async recutFromLive(
    row: typeof documentationVersions.$inferSelect,
    changelog?: string | null
  ): Promise<VersionSummary> {
    const snapshot = await this.buildSnapshot(row.documentationId);
    const [updated] = await db
      .update(documentationVersions)
      .set({ snapshot, changelog: changelog?.trim() || row.changelog })
      .where(eq(documentationVersions.id, row.id))
      .returning();
    if (!updated) {
      // The version was deleted between the lookup and the update
      throw new VersionError("Version not found", 404);
    }
    return this.toSummary(updated);
  }

  /**
   * Re-cut the stable (default) version's snapshot from the current live
   * content — used by ingestion pushes without an explicit version, so a
   * plain sync reaches readers of the stable version. Returns null when no
   * default exists (readers are already on live content).
   */
  async applyToDefaultVersion(
    documentationId: number,
    changelog?: string | null
  ): Promise<VersionSummary | null> {
    const stable = await db.query.documentationVersions.findFirst({
      where: and(
        eq(documentationVersions.documentationId, documentationId),
        eq(documentationVersions.isDefault, true),
        eq(documentationVersions.isBackup, false)
      ),
    });
    if (!stable) {
      return null;
    }

    return this.recutFromLive(stable, changelog);
  }

  /**
   * Version metadata for a documentation. The snapshot blob is never selected —
   * it can be large and is only needed when serving or forking.
   */
  async listVersions(documentationId: number, includeBackups = false): Promise<VersionSummary[]> {
    return db.query.documentationVersions.findMany({
      where: includeBackups
        ? eq(documentationVersions.documentationId, documentationId)
        : and(
            eq(documentationVersions.documentationId, documentationId),
            eq(documentationVersions.isBackup, false)
          ),
      columns: {
        id: true,
        documentationId: true,
        version: true,
        changelog: true,
        isDefault: true,
        isBackup: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [desc(documentationVersions.createdAt)],
    });
  }

  /**
   * Set or clear the stable default flag on one version of a documentation.
   * When a version becomes the default, other rows are demoted and the doc's
   * display label is synced to its label. Clearing only touches that row —
   * the plain URL then falls back to live content (the display label keeps
   * its last value until another default is set or it is edited in Settings).
   */
  async setDefault(documentationId: number, versionId: number, isDefault: boolean): Promise<void> {
    const target = await db.query.documentationVersions.findFirst({
      where: and(
        eq(documentationVersions.id, versionId),
        eq(documentationVersions.documentationId, documentationId)
      ),
      columns: { id: true, version: true, isBackup: true },
    });
    if (!target) {
      throw new VersionError("Version not found", 404);
    }
    if (target.isBackup && isDefault) {
      throw new VersionError("Automatic backups cannot be the stable default", 400);
    }

    await db.transaction(async (tx) => {
      if (!isDefault) {
        await tx
          .update(documentationVersions)
          .set({ isDefault: false })
          .where(eq(documentationVersions.id, versionId));
        return;
      }

      await tx
        .update(documentationVersions)
        .set({ isDefault: false })
        .where(eq(documentationVersions.documentationId, documentationId));

      await tx
        .update(documentationVersions)
        .set({ isDefault: true })
        .where(eq(documentationVersions.id, versionId));

      await tx
        .update(documentations)
        .set({ version: target.version })
        .where(eq(documentations.id, documentationId));
    });
  }

  async updateChangelog(documentationId: number, versionId: number, changelog: string | null) {
    const [updated] = await db
      .update(documentationVersions)
      .set({ changelog: changelog?.trim() || null })
      .where(
        and(
          eq(documentationVersions.id, versionId),
          eq(documentationVersions.documentationId, documentationId)
        )
      )
      .returning({
        id: documentationVersions.id,
        documentationId: documentationVersions.documentationId,
        version: documentationVersions.version,
        changelog: documentationVersions.changelog,
        isDefault: documentationVersions.isDefault,
        isBackup: documentationVersions.isBackup,
        createdBy: documentationVersions.createdBy,
        createdAt: documentationVersions.createdAt,
        updatedAt: documentationVersions.updatedAt,
      });
    if (!updated) {
      throw new VersionError("Version not found", 404);
    }
    return updated;
  }

  async deleteVersion(documentationId: number, versionId: number): Promise<void> {
    const deleted = await db
      .delete(documentationVersions)
      .where(
        and(
          eq(documentationVersions.id, versionId),
          eq(documentationVersions.documentationId, documentationId)
        )
      )
      .returning({ id: documentationVersions.id });
    if (deleted.length === 0) {
      throw new VersionError("Version not found", 404);
    }
    // Deleting the default simply leaves no default: the plain URL falls back
    // to live content. The doc label keeps its last value (display only).
  }

  /**
   * Build the public doc payload (same shape as GET /v1/docs/public/:id).
   * - no label: the stable default snapshot if one is set, otherwise live content
   * - "next": live content (the editable draft)
   * - any other label: that version's snapshot
   */
  async getPublicDocData(docId: number, label?: string) {
    const doc = await db.query.documentations.findFirst({
      where: and(eq(documentations.id, docId), eq(documentations.isPublic, true)),
      with: {
        creator: {
          columns: { id: true, name: true },
        },
      },
    });
    if (!doc) {
      throw new VersionError("Documentation not found or not public", 404);
    }

    const versions = await this.listVersions(docId, false);

    const serveLive = async () => {
      const items = await db.query.sidebarItems.findMany({
        where: eq(sidebarItems.documentationId, docId),
        with: { page: true },
        orderBy: [sidebarItems.order],
      });
      return {
        ...doc,
        sidebarItems: buildHierarchicalTree(items, 10, true),
        openApiSpec: await this.getLatestSpec(docId),
        versions,
        viewedVersion: null,
      };
    };

    if (label === "next") {
      return serveLive();
    }

    let row = null;
    if (label) {
      row = await db.query.documentationVersions.findFirst({
        where: and(
          eq(documentationVersions.documentationId, docId),
          eq(documentationVersions.version, label),
          eq(documentationVersions.isBackup, false)
        ),
      });
      if (!row) {
        throw new VersionError("Version not found", 404);
      }
    } else {
      row = await db.query.documentationVersions.findFirst({
        where: and(
          eq(documentationVersions.documentationId, docId),
          eq(documentationVersions.isDefault, true),
          eq(documentationVersions.isBackup, false)
        ),
      });
      if (!row) {
        return serveLive();
      }
    }

    const snapshot = row.snapshot as VersionSnapshot;
    return {
      ...doc,
      title: snapshot.documentation.title,
      description: snapshot.documentation.description,
      version: row.version,
      type: snapshot.documentation.type,
      baseUrl: snapshot.documentation.baseUrl,
      showApiEndpointsInSidebar: snapshot.documentation.showApiEndpointsInSidebar,
      sidebarItems: buildHierarchicalTree(
        snapshot.sidebarItems as unknown as SidebarItem[],
        10,
        true
      ),
      openApiSpec: snapshot.openApiSpec,
      versions,
      viewedVersion: {
        id: row.id,
        version: row.version,
        changelog: row.changelog,
        isDefault: row.isDefault,
        createdAt: row.createdAt,
      },
    };
  }

  /**
   * Copy a version snapshot back over the live content so it can be edited and
   * re-cut. Preserves row IDs wherever possible: reader URLs embed page IDs and
   * uploads cascade-delete with their page, so delete-and-recreate would break
   * bookmarks and wipe attachments. Runs in a single transaction.
   */
  async forkToLive(documentationId: number, versionId: number) {
    const row = await db.query.documentationVersions.findFirst({
      where: and(
        eq(documentationVersions.id, versionId),
        eq(documentationVersions.documentationId, documentationId)
      ),
    });
    if (!row) {
      throw new VersionError("Version not found", 404);
    }
    const snapshot = row.snapshot as VersionSnapshot;
    const snapshotItems = snapshot.sidebarItems;

    return db.transaction(async (tx) => {
      const existingItemIds = new Set(
        (
          await tx
            .select({ id: sidebarItems.id })
            .from(sidebarItems)
            .where(eq(sidebarItems.documentationId, documentationId))
        ).map((r) => r.id)
      );
      const existingPageIds = new Set(
        (
          await tx
            .select({ id: pages.id })
            .from(pages)
            .innerJoin(sidebarItems, eq(pages.sidebarItemId, sidebarItems.id))
            .where(eq(sidebarItems.documentationId, documentationId))
        ).map((r) => r.id)
      );

      // Insert missing items parents-first: parentId has an FK to sidebar_items,
      // and the denormalized `level` column may be stale, so derive the order
      // from the parentId graph itself.
      const childrenOf = new Map<number, SnapshotSidebarItem[]>();
      const roots: SnapshotSidebarItem[] = [];
      for (const item of snapshotItems) {
        if (item.parentId === null || item.parentId === undefined) {
          roots.push(item);
        } else {
          const siblings = childrenOf.get(item.parentId);
          if (siblings) siblings.push(item);
          else childrenOf.set(item.parentId, [item]);
        }
      }
      const insertOrder: SnapshotSidebarItem[] = [];
      const stack = [...roots];
      while (stack.length > 0) {
        const item = stack.pop()!;
        insertOrder.push(item);
        const children = childrenOf.get(item.id);
        if (children) stack.push(...children);
      }

      for (const item of insertOrder) {
        const columns = {
          title: item.title,
          type: item.type,
          parentId: item.parentId ?? null,
          order: item.order,
          icon: item.icon ?? null,
          isExpanded: item.isExpanded ?? true,
          // Snapshot rows are always active; updating a trashed row revives it.
          deletedAt: null,
          deletedBy: null,
          materializedPath: item.materializedPath ?? "",
          level: item.level ?? 0,
          isActive: item.isActive ?? true,
          createdAt: new Date(item.createdAt),
        };
        if (existingItemIds.has(item.id)) {
          await tx.update(sidebarItems).set(columns).where(eq(sidebarItems.id, item.id));
        } else {
          await tx.insert(sidebarItems).values({ id: item.id, documentationId, ...columns });
        }
      }

      // Remove stray live pages attached to snapshot items (page deleted and
      // re-created after the cut) so each item keeps exactly the snapshot page.
      const snapshotItemIds = snapshotItems.map((item) => item.id);
      const snapshotPageIds = snapshotItems
        .filter((item) => item.page)
        .map((item) => item.page!.id);
      if (snapshotItemIds.length > 0) {
        await tx
          .delete(pages)
          .where(
            and(
              inArray(pages.sidebarItemId, snapshotItemIds),
              snapshotPageIds.length > 0
                ? notInArray(pages.id, snapshotPageIds)
                : sql`true`
            )
          );
      }

      let restoredPages = 0;
      for (const item of snapshotItems) {
        const page = item.page;
        if (!page) continue;
        restoredPages++;
        const columns = {
          slug: page.slug,
          content: page.content,
          metadata: page.metadata,
          createdAt: new Date(page.createdAt),
          updatedAt: new Date(page.updatedAt),
        };
        if (existingPageIds.has(page.id)) {
          await tx.update(pages).set(columns).where(eq(pages.id, page.id));
        } else {
          await tx
            .insert(pages)
            .values({ id: page.id, sidebarItemId: item.id, ...columns });
        }
      }

      // Remove live items the snapshot doesn't contain (their pages and
      // attachments cascade). Trashed items are left alone — fork makes the
      // live tree match the version, it doesn't clear the trash.
      const activeNotInSnapshot = and(
        eq(sidebarItems.documentationId, documentationId),
        isNull(sidebarItems.deletedAt),
        snapshotItemIds.length > 0
          ? notInArray(sidebarItems.id, snapshotItemIds)
          : sql`true`
      );
      await tx.delete(sidebarItems).where(activeNotInSnapshot);

      // Replace the OpenAPI specs with the snapshot's (mirrors the existing
      // delete-then-insert behavior of the openapi routes).
      await tx.delete(openApiSpecs).where(eq(openApiSpecs.documentationId, documentationId));
      if (snapshot.openApiSpec) {
        await tx.insert(openApiSpecs).values({
          documentationId,
          specVersion: snapshot.openApiSpec.specVersion || "3.1.0",
          info: snapshot.openApiSpec.info,
          servers: snapshot.openApiSpec.servers ?? null,
          paths: snapshot.openApiSpec.paths ?? null,
          components: snapshot.openApiSpec.components ?? null,
          security: snapshot.openApiSpec.security ?? null,
          tags: snapshot.openApiSpec.tags ?? null,
          externalDocs: snapshot.openApiSpec.externalDocs ?? null,
          rawSpec: snapshot.openApiSpec.rawSpec ?? null,
        });
      }

      // Explicit-ID inserts don't advance the sequences; bump them so the next
      // auto-generated row can't collide.
      await tx.execute(
        sql`SELECT setval(pg_get_serial_sequence('sidebar_items', 'id'), COALESCE((SELECT MAX(id) FROM sidebar_items), 0) + 1, false)`
      );
      await tx.execute(
        sql`SELECT setval(pg_get_serial_sequence('pages', 'id'), COALESCE((SELECT MAX(id) FROM pages), 0) + 1, false)`
      );

      return { restoredItems: snapshotItems.length, restoredPages };
    });
  }

  /**
   * Safety net before anything destructively replaces the live content
   * (external ingestion, version restore): snapshot the current content
   * first, then prune so only the newest few backups are kept.
   */
  async createAutoBackup(documentationId: number): Promise<VersionSummary | null> {
    const itemCount = await db.query.sidebarItems.findMany({
      where: and(
        eq(sidebarItems.documentationId, documentationId),
        isNull(sidebarItems.deletedAt)
      ),
      columns: { id: true },
    });
    if (itemCount.length === 0) {
      return null;
    }

    // Millisecond precision keeps sequential backups unique: a doc's ingestion
    // is inherently serial (each run destructively replaces the content).
    const d = new Date();
    const pad = (n: number, len = 2) => String(n).padStart(len, "0");
    const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(
      d.getHours()
    )}${pad(d.getMinutes())}${pad(d.getSeconds())}${pad(d.getMilliseconds(), 3)}`;

    const backup = await this.createVersion(documentationId, {
      version: `backup-${stamp}`,
      changelog: "Automatic backup before external ingestion",
      isBackup: true,
    });

    const backups = await db.query.documentationVersions.findMany({
      where: and(
        eq(documentationVersions.documentationId, documentationId),
        eq(documentationVersions.isBackup, true)
      ),
      columns: { id: true },
      orderBy: [desc(documentationVersions.createdAt)],
    });
    for (const old of backups.slice(MAX_INGESTION_BACKUPS)) {
      await db.delete(documentationVersions).where(eq(documentationVersions.id, old.id));
    }

    return backup;
  }

  private async buildSnapshot(documentationId: number): Promise<VersionSnapshot> {
    const doc = await db.query.documentations.findFirst({
      where: eq(documentations.id, documentationId),
      columns: {
        title: true,
        description: true,
        version: true,
        type: true,
        baseUrl: true,
        showApiEndpointsInSidebar: true,
      },
    });
    if (!doc) {
      throw new VersionError("Documentation not found", 404);
    }

    const items = await db.query.sidebarItems.findMany({
      where: and(
        eq(sidebarItems.documentationId, documentationId),
        isNull(sidebarItems.deletedAt)
      ),
      with: { page: true },
      orderBy: [sidebarItems.order],
    });

    return {
      documentation: doc,
      sidebarItems: items as unknown as SnapshotSidebarItem[],
      openApiSpec: (await this.getLatestSpec(documentationId)) as VersionSnapshot["openApiSpec"],
    };
  }

  private async getLatestSpec(documentationId: number) {
    const spec = await db.query.openApiSpecs.findFirst({
      where: eq(openApiSpecs.documentationId, documentationId),
      orderBy: [desc(openApiSpecs.updatedAt)],
    });
    return spec ?? null;
  }

  private toSummary(row: typeof documentationVersions.$inferSelect): VersionSummary {
    return {
      id: row.id,
      version: row.version,
      changelog: row.changelog,
      isDefault: row.isDefault,
      isBackup: row.isBackup,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

export default new VersionService();
