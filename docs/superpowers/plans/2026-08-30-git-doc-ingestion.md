# Numbered Markdown Ordering + Git Doc Ingestion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a project sync its `/docs`-style folder straight into a Docmate documentation project over HTTP, using the same `N-title` numeric-prefix filename convention for both directions of Docmate's existing Markdown export/import, so export → import round-trips losslessly and a developer's hand-written docs folder behaves the same way — and ship a zero-dependency `docmate-ingest` npm package so a developer never has to hand-write the file-walking/payload/HTTP glue themselves.

**Architecture:** Extract the sidebar-tree-from-markdown-files logic that currently lives inside `import.service.ts` into a shared, dependency-free utility module. Teach that module to read and write `N-title` numeric ordering prefixes on file/folder names. Reuse it from three call sites: the existing ZIP import, the existing Markdown export, and a new `POST /v1/external-docs/ingest-markdown` endpoint that authenticates with the same per-documentation ingestion token the existing OpenAPI ingestion endpoint already uses. Ship a standalone `packages/docmate-ingest` npm package (CLI + importable function, zero runtime dependencies, plain Node.js) that walks a docs folder, builds the request payload, and POSTs it to that endpoint — this is the first of what can later become a family of per-language client packages (Python, etc.), started with npm because it fits this repo's stack and covers the most common CI (Node scripts, GitHub Actions).

**Tech Stack:** Backend: Bun.js, Hono, Drizzle ORM (PostgreSQL), Zod, `bun:test` (integration tests against the real dev database, matching existing test files). Client package: plain Node.js (CommonJS, Node >=18 for global `fetch`), `node:test` for its tests — no runtime dependencies.

**Spec:** No separate spec document — requirements were captured directly in conversation with the user (2026-08-30) and are restated in Global Constraints below.

## Global Constraints

- No new dependencies. Everything is buildable with what's already in `backend/package.json` (`archiver`, `yauzl`, `hono`, `@hono/zod-validator`, `zod`, `drizzle-orm`).
- Numeric ordering convention: a file or folder segment may be prefixed `N-` (e.g. `1-getting-started.md`, `2-api/`). `N` sets sidebar `order`; the remainder becomes the title (title-cased, dashes → spaces). Segments without a prefix keep today's fallback behavior (insertion-order counter).
- Project identification for git ingestion reuses the existing per-documentation `ingestionToken` / `ingestionEnabled` columns and Bearer-token middleware already used by `POST /v1/external-docs/ingest` — no new config file, no repo cloning by the backend. The external caller (CI script, git hook, etc.) reads its own files and POSTs their contents.
- Follow existing code style: no doc comments beyond one-line "why" comments, `private`/public method split in service classes, Zod schemas colocated with their route, integration tests written against the real dev DB using `db.insert`/`db.delete` cleanup in `beforeAll`/`afterAll` (see `backend/src/tests/authorize.test.ts`).
- Don't touch `importFromJson`, PDF export, or the OpenAPI ingestion (`/ingest`) logic — out of scope.
- Don't fix the pre-existing `_index.md` table-of-contents-uses-`page.slug`-while-files-use-sanitized-title mismatch in `export.service.ts` — noted but out of scope for this plan.

---

## File Structure

| File | Responsibility |
|---|---|
| `backend/src/utils/markdownSidebar.ts` (new) | Pure functions: slugify, parse/generate numeric-prefixed segments, parse frontmatter, build a nested sidebar tree from a flat file map. No DB, no I/O. |
| `backend/src/services/import.service.ts` (modify) | Delegates tree-building to the new util; gains a public `replaceSidebarContent` method reused by ZIP re-import and the new route. |
| `backend/src/services/export.service.ts` (modify) | Uses the new util's segment generator so exported filenames carry numeric prefixes. |
| `backend/src/routes/externalDocsRoute.ts` (modify) | New `POST /ingest-markdown` route sharing the existing token middleware. |
| `backend/src/tests/markdownSidebar.test.ts` (new) | Unit tests for the pure util functions. |
| `backend/src/tests/exportImportRoundtrip.test.ts` (new) | Integration test: DB → export ZIP → import ZIP → DB, asserting order/nesting survive. |
| `backend/src/tests/externalMarkdownIngest.test.ts` (new) | Integration tests for the new route (auth, ingest, re-ingest replaces content). |
| `packages/docmate-ingest/lib/ingest.js` (new) | Core logic: walk a docs folder into `{path, content}` files, POST them to the ingestion endpoint. |
| `packages/docmate-ingest/bin/docmate-ingest.js` (new) | CLI entry point (flag parsing, calls `lib/ingest.js`, prints result). |
| `packages/docmate-ingest/package.json` (new) | Package manifest — `bin`, `main`, zero runtime dependencies. |
| `packages/docmate-ingest/test/ingest.test.js` (new) | `node:test` unit tests for the walking/POST logic with a stubbed `fetch`. |
| `packages/docmate-ingest/README.md` (new) | Package usage docs (CLI flags, env vars, GitHub Actions example, library usage). |
| `README.md` (modify) | Documents the new endpoint and the `docmate-ingest` package next to the existing "External Ingestion API" section. |
| `docs/IMPORT_GUIDE.md` (modify) | Documents the numeric-prefix ordering convention for both ZIP import and the new endpoint. |

---

### Task 1: Shared markdown-sidebar utility module

**Files:**
- Create: `backend/src/utils/markdownSidebar.ts`
- Test: `backend/src/tests/markdownSidebar.test.ts`

**Interfaces:**
- Produces (consumed by Tasks 2, 3, 5):
  - `interface ParsedPage { title: string; slug: string; content: any; metadata: any; created_at?: string; updated_at?: string; }`
  - `interface ParsedSidebarItem { id: number; title: string; type: "folder" | "page" | "divider"; order: number; children: ParsedSidebarItem[]; page?: ParsedPage; }`
  - `slugify(text: string): string`
  - `parseOrderedSegment(segment: string): { order: number | null; title: string }`
  - `orderedSegment(title: string, position: number): string`
  - `parseFrontmatter(content: string): { title?: string; slug?: string; metadata?: any; created_at?: string; updated_at?: string; }`
  - `buildSidebarFromMarkdownFiles(files: Record<string, Buffer | string>, pagesPrefix?: string): ParsedSidebarItem[]` (default `pagesPrefix = "pages/"`)

- [ ] **Step 1: Write the failing tests**

Create `backend/src/tests/markdownSidebar.test.ts`:

```ts
import { describe, test, expect } from "bun:test";
import {
  slugify,
  parseOrderedSegment,
  orderedSegment,
  parseFrontmatter,
  buildSidebarFromMarkdownFiles,
} from "../utils/markdownSidebar";

describe("markdownSidebar utils", () => {
  test("slugify normalizes titles into file-safe segments", () => {
    expect(slugify("Getting Started!")).toBe("getting-started");
    expect(slugify("  Multiple   Spaces  ")).toBe("multiple-spaces");
    expect(slugify("API")).toBe("api");
  });

  test("parseOrderedSegment extracts a numeric prefix and title-cases the remainder", () => {
    expect(parseOrderedSegment("2-getting-started")).toEqual({
      order: 2,
      title: "Getting Started",
    });
    expect(parseOrderedSegment("10-advanced-usage")).toEqual({
      order: 10,
      title: "Advanced Usage",
    });
  });

  test("parseOrderedSegment falls back to null order when there is no prefix", () => {
    expect(parseOrderedSegment("getting-started")).toEqual({
      order: null,
      title: "Getting Started",
    });
  });

  test("orderedSegment is the inverse of parseOrderedSegment", () => {
    expect(orderedSegment("Getting Started", 1)).toBe("1-getting-started");
    const parsed = parseOrderedSegment(orderedSegment("Advanced Usage", 12));
    expect(parsed).toEqual({ order: 12, title: "Advanced Usage" });
  });

  test("parseFrontmatter reads simple YAML frontmatter", () => {
    const content = `---\ntitle: "Custom Title"\nslug: "custom-slug"\n---\n\n# Body`;
    expect(parseFrontmatter(content)).toEqual(
      expect.objectContaining({ title: "Custom Title", slug: "custom-slug" })
    );
  });

  test("parseFrontmatter returns an empty object when there is no frontmatter", () => {
    expect(parseFrontmatter("# Just a heading")).toEqual({});
  });

  test("buildSidebarFromMarkdownFiles orders siblings by numeric prefix regardless of map insertion order", () => {
    const files = {
      "pages/2-authentication.md": "# Auth",
      "pages/1-getting-started.md": "# Welcome",
    };

    const tree = buildSidebarFromMarkdownFiles(files);

    expect(tree.map((i) => i.title)).toEqual(["Getting Started", "Authentication"]);
    expect(tree.every((i) => i.type === "page")).toBe(true);
  });

  test("buildSidebarFromMarkdownFiles nests folders and sorts children at every level", () => {
    const files = {
      "pages/2-api/2-webhooks.md": "# Webhooks",
      "pages/2-api/1-authentication.md": "# Auth",
      "pages/1-getting-started.md": "# Welcome",
    };

    const tree = buildSidebarFromMarkdownFiles(files);

    expect(tree.map((i) => i.title)).toEqual(["Getting Started", "Api"]);
    const apiFolder = tree.find((i) => i.title === "Api")!;
    expect(apiFolder.type).toBe("folder");
    expect(apiFolder.children.map((i) => i.title)).toEqual(["Authentication", "Webhooks"]);
  });

  test("buildSidebarFromMarkdownFiles respects a custom (empty) pagesPrefix for git-style payloads", () => {
    const files = {
      "2-auth.md": "# Auth",
      "1-intro.md": "# Intro",
    };

    const tree = buildSidebarFromMarkdownFiles(files, "");

    expect(tree.map((i) => i.title)).toEqual(["Intro", "Auth"]);
  });

  test("buildSidebarFromMarkdownFiles falls back to insertion order when there is no numeric prefix", () => {
    const files = {
      "pages/getting-started.md": "# Welcome",
      "pages/authentication.md": "# Auth",
    };

    const tree = buildSidebarFromMarkdownFiles(files);

    expect(tree.map((i) => i.title)).toEqual(["Getting Started", "Authentication"]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && bun test src/tests/markdownSidebar.test.ts`
Expected: FAIL — `Cannot find module '../utils/markdownSidebar'`

- [ ] **Step 3: Implement the utility module**

Create `backend/src/utils/markdownSidebar.ts`:

```ts
export interface ParsedPage {
  title: string;
  slug: string;
  content: any;
  metadata: any;
  created_at?: string;
  updated_at?: string;
}

export interface ParsedSidebarItem {
  id: number;
  title: string;
  type: "folder" | "page" | "divider";
  order: number;
  children: ParsedSidebarItem[];
  page?: ParsedPage;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function titleCase(text: string): string {
  return text.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export function parseOrderedSegment(segment: string): { order: number | null; title: string } {
  const match = segment.match(/^(\d+)-(.+)$/);
  if (match) {
    return { order: parseInt(match[1], 10), title: titleCase(match[2]) };
  }
  return { order: null, title: titleCase(segment) };
}

export function orderedSegment(title: string, position: number): string {
  return `${position}-${slugify(title)}`;
}

export function parseFrontmatter(content: string): {
  title?: string;
  slug?: string;
  metadata?: any;
  created_at?: string;
  updated_at?: string;
} {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return {};
  }

  try {
    const frontmatterData: any = {};

    match[1].split("\n").forEach((line) => {
      const colonIndex = line.indexOf(":");
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        let value = line.substring(colonIndex + 1).trim();

        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }

        frontmatterData[key] = value;
      }
    });

    return {
      title: frontmatterData.title,
      slug: frontmatterData.slug,
      metadata: frontmatterData,
      created_at: frontmatterData.created_at,
      updated_at: frontmatterData.updated_at,
    };
  } catch (error) {
    console.warn("Failed to parse frontmatter:", error);
    return {};
  }
}

/**
 * Path segments (folders and the final filename) may carry a numeric ordering
 * prefix ("1-getting-started.md", "2-api/1-auth.md"). Prefixed segments sort
 * by that number; unprefixed segments fall back to a shared insertion-order
 * counter, matching the pre-numeric-prefix behavior.
 */
export function buildSidebarFromMarkdownFiles(
  files: Record<string, Buffer | string>,
  pagesPrefix: string = "pages/"
): ParsedSidebarItem[] {
  const rootSidebarItems: ParsedSidebarItem[] = [];
  const folderMap = new Map<string, ParsedSidebarItem>();
  let fallbackOrder = 0;

  const pageFiles = Object.keys(files).filter(
    (filename) => filename.startsWith(pagesPrefix) && filename.endsWith(".md")
  );

  pageFiles.forEach((filename) => {
    const raw = files[filename];
    const content = typeof raw === "string" ? raw : raw.toString();
    const relativePath = filename.startsWith(pagesPrefix)
      ? filename.slice(pagesPrefix.length)
      : filename;
    const pathParts = relativePath.replace(/\.md$/, "").split("/");
    const pageData = parseFrontmatter(content);

    let currentChildren = rootSidebarItems;
    let currentPath = "";

    for (let i = 0; i < pathParts.length - 1; i++) {
      const folderSegment = pathParts[i];
      currentPath = currentPath ? `${currentPath}/${folderSegment}` : folderSegment;

      if (!folderMap.has(currentPath)) {
        const { order, title } = parseOrderedSegment(folderSegment);
        const folderItem: ParsedSidebarItem = {
          id: -1,
          title,
          type: "folder",
          order: order ?? fallbackOrder++,
          children: [],
        };
        folderMap.set(currentPath, folderItem);
        currentChildren.push(folderItem);
      }

      currentChildren = folderMap.get(currentPath)!.children;
    }

    const fileSegment = pathParts[pathParts.length - 1];
    const { order, title: parsedTitle } = parseOrderedSegment(fileSegment);
    const pageTitle = pageData.title || parsedTitle;

    currentChildren.push({
      id: -1,
      title: pageTitle,
      type: "page",
      order: order ?? fallbackOrder++,
      children: [],
      page: {
        title: pageTitle,
        slug: pageData.slug || slugify(fileSegment.replace(/^\d+-/, "")),
        content: { description: content },
        metadata: pageData.metadata,
        created_at: pageData.created_at,
        updated_at: pageData.updated_at,
      },
    });
  });

  const sortTree = (items: ParsedSidebarItem[]): ParsedSidebarItem[] => {
    items.sort((a, b) => a.order - b.order);
    items.forEach((item) => {
      if (item.children.length > 0) {
        sortTree(item.children);
      }
    });
    return items;
  };

  return sortTree(rootSidebarItems);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && bun test src/tests/markdownSidebar.test.ts`
Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/src/utils/markdownSidebar.ts backend/src/tests/markdownSidebar.test.ts
git commit -m "feat: add shared markdown-sidebar util with numeric ordering prefixes"
```

---

### Task 2: Wire `import.service.ts` to the shared util

**Files:**
- Modify: `backend/src/services/import.service.ts`

**Interfaces:**
- Consumes: `buildSidebarFromMarkdownFiles`, `ParsedPage`, `ParsedSidebarItem` from `../utils/markdownSidebar` (Task 1).
- Produces: `ImportService.replaceSidebarContent(documentationId: number, items: ImportSidebarItem[]): Promise<number>` (public), consumed by Task 5's route handler.

- [ ] **Step 1: Replace the local interfaces with the shared types**

In `backend/src/services/import.service.ts`, replace lines 1–34 (imports through the `ImportSidebarItem`/`ImportDocument` interface block up to but not including `ImportMetadata`) — i.e. replace:

```ts
import { eq, inArray, and, desc, isNull } from "drizzle-orm";
import db from "../db";
import {
  documentations,
  sidebarItems,
  pages,
  openApiSpecs,
  users,
  type Documentation,
  type SidebarItem,
  type Page,
  type OpenApiSpec,
} from "../db/schema";
import yauzl from "yauzl";

// Types for import data structures (matching export types)
interface ImportPage {
  title: string;
  slug: string;
  content: any;
  metadata: any;
  created_at?: string;
  updated_at?: string;
}

interface ImportSidebarItem {
  id: number;
  title: string;
  type: "folder" | "page" | "divider";
  order: number;
  icon?: string;
  children: ImportSidebarItem[];
  page?: ImportPage;
}

interface ImportDocument {
  title: string;
  description?: string;
  version: string;
  type: "traditional" | "api" | "mixed";
  isPublic: boolean;
  showApiEndpointsInSidebar: boolean;
  baseUrl?: string;
  sidebarItems: ImportSidebarItem[];
  openApiSpecs?: OpenApiSpec[];
}
```

with:

```ts
import { eq, inArray, and, desc, isNull } from "drizzle-orm";
import db from "../db";
import {
  documentations,
  sidebarItems,
  pages,
  openApiSpecs,
  users,
  type Documentation,
  type SidebarItem,
  type Page,
  type OpenApiSpec,
} from "../db/schema";
import yauzl from "yauzl";
import {
  buildSidebarFromMarkdownFiles,
  type ParsedPage,
  type ParsedSidebarItem,
} from "../utils/markdownSidebar";

// Types for import data structures (matching export types)
type ImportPage = ParsedPage;
type ImportSidebarItem = ParsedSidebarItem;

interface ImportDocument {
  title: string;
  description?: string;
  version: string;
  type: "traditional" | "api" | "mixed";
  isPublic: boolean;
  showApiEndpointsInSidebar: boolean;
  baseUrl?: string;
  sidebarItems: ImportSidebarItem[];
  openApiSpecs?: OpenApiSpec[];
}
```

- [ ] **Step 2: Remove the now-duplicated private methods**

Delete the `buildSidebarFromMarkdown` method (originally lines 309–375, the block starting `/**\n   * Build sidebar structure from markdown files\n   */` through its closing `return rootSidebarItems.sort(...)\n  }`) and the `parseMarkdownFile` method (originally lines 377–428, from `/**\n   * Parse markdown file frontmatter\n   */` through its closing `return {};\n  }`) entirely from `import.service.ts`. Both are now provided by `buildSidebarFromMarkdownFiles` / `parseFrontmatter` in `../utils/markdownSidebar`.

- [ ] **Step 3: Update `importFromZip` to call the shared builder and expose `replaceSidebarContent`**

Replace this block inside `importFromZip` (originally around lines 167–222):

```ts
      let document: Documentation;

      if (documentId) {
        // Update existing document
        const existingDoc = await db.query.documentations.findFirst({
          where: eq(documentations.id, documentId),
        });

        if (!existingDoc) {
          throw new Error("Document not found");
        }

        // Clear existing content
        await this.deleteDocumentContent(documentId);

        // Update document metadata
        const [updatedDoc] = await db
          .update(documentations)
          .set({
            title: metadata.title,
            description: metadata.description || null,
            version: metadata.version || "1.0.0",
            type: metadata.type || "traditional",
            isPublic: metadata.isPublic || false,
            baseUrl: metadata.baseUrl || null,
            showApiEndpointsInSidebar: metadata.showApiEndpointsInSidebar || false,
            updatedAt: new Date(),
          })
          .where(eq(documentations.id, documentId))
          .returning();

        document = updatedDoc;
      } else {
        // Create new document
        const [newDoc] = await db
          .insert(documentations)
          .values({
            title: metadata.title,
            description: metadata.description || null,
            version: metadata.version || "1.0.0",
            type: metadata.type || "traditional",
            isPublic: metadata.isPublic || false,
            baseUrl: metadata.baseUrl || null,
            showApiEndpointsInSidebar: metadata.showApiEndpointsInSidebar || false,
            createdBy: userId,
          })
          .returning();

        document = newDoc;
      }

      // Parse pages from markdown files
      const sidebarItems = this.buildSidebarFromMarkdown(extractedFiles);

      // Import sidebar items and pages
      const createdItems = await this.importSidebarItems(sidebarItems, document.id, null);
```

with:

```ts
      let document: Documentation;

      if (documentId) {
        // Update existing document
        const existingDoc = await db.query.documentations.findFirst({
          where: eq(documentations.id, documentId),
        });

        if (!existingDoc) {
          throw new Error("Document not found");
        }

        // Update document metadata
        const [updatedDoc] = await db
          .update(documentations)
          .set({
            title: metadata.title,
            description: metadata.description || null,
            version: metadata.version || "1.0.0",
            type: metadata.type || "traditional",
            isPublic: metadata.isPublic || false,
            baseUrl: metadata.baseUrl || null,
            showApiEndpointsInSidebar: metadata.showApiEndpointsInSidebar || false,
            updatedAt: new Date(),
          })
          .where(eq(documentations.id, documentId))
          .returning();

        document = updatedDoc;
      } else {
        // Create new document
        const [newDoc] = await db
          .insert(documentations)
          .values({
            title: metadata.title,
            description: metadata.description || null,
            version: metadata.version || "1.0.0",
            type: metadata.type || "traditional",
            isPublic: metadata.isPublic || false,
            baseUrl: metadata.baseUrl || null,
            showApiEndpointsInSidebar: metadata.showApiEndpointsInSidebar || false,
            createdBy: userId,
          })
          .returning();

        document = newDoc;
      }

      // Parse pages from markdown files
      const sidebarItems = buildSidebarFromMarkdownFiles(extractedFiles);

      // Import sidebar items and pages (replacing existing content on update)
      const createdItems = documentId
        ? await this.replaceSidebarContent(document.id, sidebarItems)
        : await this.importSidebarItems(sidebarItems, document.id, null);
```

Note this preserves the original behavior exactly: updates now delete-then-insert via `replaceSidebarContent` (delete moved from before the metadata update to right before the insert — both tables are independent, so this has no observable effect), and new documents still go straight to `importSidebarItems`.

- [ ] **Step 4: Add the public `replaceSidebarContent` method**

Add this method to the `ImportService` class, directly above the existing `private async deleteDocumentContent(...)` method:

```ts
  /**
   * Replaces all sidebar items and pages for a document with a new tree.
   * Used by ZIP re-import and by the external markdown ingestion route.
   */
  async replaceSidebarContent(
    documentationId: number,
    items: ImportSidebarItem[]
  ): Promise<number> {
    await this.deleteDocumentContent(documentationId);
    return this.importSidebarItems(items, documentationId, null);
  }
```

- [ ] **Step 5: Type-check**

Run: `cd backend && bunx tsc --noEmit`
Expected: no errors referencing `import.service.ts`

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/import.service.ts
git commit -m "refactor: delegate markdown sidebar parsing to shared util, expose replaceSidebarContent"
```

---

### Task 3: Numeric prefixes on export

**Files:**
- Modify: `backend/src/services/export.service.ts`

**Interfaces:**
- Consumes: `orderedSegment` from `../utils/markdownSidebar` (Task 1).

- [ ] **Step 1: Import the util**

At the top of `backend/src/services/export.service.ts`, after the existing `import { Readable } from 'stream';` line, add:

```ts
import { orderedSegment } from '../utils/markdownSidebar';
```

- [ ] **Step 2: Generate numbered filenames/foldernames**

Replace the `generatePageMarkdown` closure inside `generateMarkdownExport` (originally lines 214–233):

```ts
    const generatePageMarkdown = (items: ExportSidebarItem[], basePath: string = ''): void => {
      items.forEach(item => {
        if (item.type === 'page' && item.page) {
          // Use page title for filename instead of auto-generated slug
          const pageTitle = item.page.title || item.title || 'untitled-page';
          const sanitizedTitle = pageTitle.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-') // Replace multiple hyphens with single
            .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

          const pagePath = basePath ? `${basePath}/${sanitizedTitle}` : sanitizedTitle;
          const content = this.generatePageMarkdown(item.page, document);
          files.push({ path: `pages/${pagePath}.md`, content });
        } else if (item.type === 'folder' && item.children.length > 0) {
          const folderPath = basePath ? `${basePath}/${item.title.toLowerCase().replace(/\s+/g, '-')}` : item.title.toLowerCase().replace(/\s+/g, '-');
          generatePageMarkdown(item.children, folderPath);
        }
      });
    };
```

with:

```ts
    const generatePageMarkdown = (items: ExportSidebarItem[], basePath: string = ''): void => {
      items.forEach((item, index) => {
        const position = index + 1;
        if (item.type === 'page' && item.page) {
          const pageTitle = item.page.title || item.title || 'untitled-page';
          const fileSegment = orderedSegment(pageTitle, position);
          const pagePath = basePath ? `${basePath}/${fileSegment}` : fileSegment;
          const content = this.generatePageMarkdown(item.page, document);
          files.push({ path: `pages/${pagePath}.md`, content });
        } else if (item.type === 'folder' && item.children.length > 0) {
          const folderSegment = orderedSegment(item.title, position);
          const folderPath = basePath ? `${basePath}/${folderSegment}` : folderSegment;
          generatePageMarkdown(item.children, folderPath);
        }
      });
    };
```

`items` here is already sorted by `order` (it comes from `buildSidebarTree`, which sorts siblings before recursing), so `index + 1` gives each sibling a stable, human-readable position.

- [ ] **Step 3: Type-check**

Run: `cd backend && bunx tsc --noEmit`
Expected: no errors referencing `export.service.ts`

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/export.service.ts
git commit -m "feat: emit numeric ordering prefixes in markdown export filenames"
```

---

### Task 4: Export → import round-trip integration test

**Files:**
- Test: `backend/src/tests/exportImportRoundtrip.test.ts`

**Interfaces:**
- Consumes: `exportService.createMarkdownZip` (existing), `importService.importFromZip` (existing, now backed by Tasks 2–3).

- [ ] **Step 1: Write the test**

Create `backend/src/tests/exportImportRoundtrip.test.ts`:

```ts
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
```

`"API"` round-trips as `"Api"` because slugify/title-case is case-insensitive by design (same limitation that exists today for any all-caps title) — this is expected, not a bug.

- [ ] **Step 2: Run the test**

Run: `cd backend && bun test src/tests/exportImportRoundtrip.test.ts`
Expected: PASS. Requires a reachable dev database (same requirement as the existing `authorize.test.ts`).

- [ ] **Step 3: Commit**

```bash
git add backend/src/tests/exportImportRoundtrip.test.ts
git commit -m "test: verify markdown export/import round trip preserves order and nesting"
```

---

### Task 5: `POST /v1/external-docs/ingest-markdown` route

**Files:**
- Modify: `backend/src/routes/externalDocsRoute.ts`

**Interfaces:**
- Consumes: `buildSidebarFromMarkdownFiles` (Task 1), `importService.replaceSidebarContent` (Task 2).
- Produces: `POST /v1/external-docs/ingest-markdown`, same Bearer-token auth as `/ingest`, request body `{ files: { path: string; content: string }[]; version?: string; isPublic?: boolean }`, response `{ success: true, docId, createdItems, message }`.

- [ ] **Step 1: Widen the auth middleware to cover both routes**

In `backend/src/routes/externalDocsRoute.ts`, change:

```ts
// Middleware to check for the ingestion token
externalDocs.use("/ingest", async (c, next) => {
```

to:

```ts
// Middleware to check for the ingestion token
externalDocs.use("*", async (c, next) => {
```

- [ ] **Step 2: Add the imports**

Add after the existing `import { z } from "zod";` line:

```ts
import importService from "../services/import.service";
import { buildSidebarFromMarkdownFiles } from "../utils/markdownSidebar";
```

- [ ] **Step 3: Add the schema and route handler**

Insert this block after the existing `externalDocs.post("/ingest", ...)` handler and before `export default externalDocs;`:

```ts
// Schema for markdown ingestion payload
const markdownIngestionSchema = z.object({
  files: z
    .array(
      z.object({
        path: z.string().min(1),
        content: z.string(),
      })
    )
    .min(1),
  version: z.string().optional(),
  isPublic: z.boolean().optional(),
});

externalDocs.post("/ingest-markdown", zValidator("json", markdownIngestionSchema), async (c) => {
  try {
    const body = c.req.valid("json");
    const { files, version, isPublic } = body;
    const doc = c.get("documentation"); // Set by middleware

    const fileMap: Record<string, string> = {};
    for (const file of files) {
      fileMap[file.path] = file.content;
    }

    const parsedSidebarItems = buildSidebarFromMarkdownFiles(fileMap, "");

    if (parsedSidebarItems.length === 0) {
      return c.json({ error: "No markdown files found in payload" }, 400);
    }

    const createdItems = await importService.replaceSidebarContent(doc.id, parsedSidebarItems);

    await db
      .update(documentations)
      .set({
        version: version || doc.version,
        updatedAt: new Date(),
        isPublic: isPublic !== undefined ? isPublic : doc.isPublic,
      })
      .where(eq(documentations.id, doc.id));

    return c.json({
      success: true,
      docId: doc.id,
      createdItems,
      message: "Documentation updated successfully",
    });
  } catch (error) {
    console.error("Markdown ingestion error:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});
```

`files` is intentionally scoped to a local `fileMap` variable — a local named `sidebarItems` would shadow the `sidebarItems` table already imported at the top of this file, which is why the parsed tree is named `parsedSidebarItems` instead.

- [ ] **Step 4: Type-check**

Run: `cd backend && bunx tsc --noEmit`
Expected: no errors referencing `externalDocsRoute.ts`

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/externalDocsRoute.ts
git commit -m "feat: add POST /v1/external-docs/ingest-markdown endpoint"
```

---

### Task 6: Integration tests for the ingestion route

**Files:**
- Test: `backend/src/tests/externalMarkdownIngest.test.ts`

**Interfaces:**
- Consumes: `app` (Hono instance, `backend/src/app.ts`, existing) via `app.request(...)`, same pattern as `backend/src/tests/authorize.test.ts`.

- [ ] **Step 1: Write the tests**

Create `backend/src/tests/externalMarkdownIngest.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests**

Run: `cd backend && bun test src/tests/externalMarkdownIngest.test.ts`
Expected: PASS (5 tests). Requires a reachable dev database.

- [ ] **Step 3: Run the full backend test suite to confirm no regressions**

Run: `cd backend && bun run test`
Expected: all suites (existing `authorize.test.ts`, `proxy.test.ts`, `security.test.ts`, plus the three new files) PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/src/tests/externalMarkdownIngest.test.ts
git commit -m "test: cover POST /v1/external-docs/ingest-markdown auth and ingest behavior"
```

---

### Task 7: `docmate-ingest` package — core logic and CLI

**Files:**
- Create: `packages/docmate-ingest/package.json`
- Create: `packages/docmate-ingest/lib/ingest.js`
- Create: `packages/docmate-ingest/bin/docmate-ingest.js`

**Interfaces:**
- Consumes: `POST /v1/external-docs/ingest-markdown` (Task 5).
- Produces (consumed by Task 8's tests and by the CLI): `collectMarkdownFiles(dir: string): { path: string; content: string }[]`, `ingest(options: { url: string; token: string; dir: string; version?: string; isPublic?: boolean; fetchImpl?: typeof fetch }): Promise<{ success: boolean; docId: number; createdItems: number; message: string }>`.

No test-first step here — this task is glue/IO code around `fs` and `fetch`; its behavior is verified by Task 8's tests against the real filesystem and a stubbed `fetch`, written immediately after.

- [ ] **Step 1: Create the package manifest**

Create `packages/docmate-ingest/package.json`:

```json
{
  "name": "docmate-ingest",
  "version": "0.1.0",
  "description": "Sync a project's markdown docs folder into a Docmate documentation project",
  "license": "MIT",
  "bin": {
    "docmate-ingest": "./bin/docmate-ingest.js"
  },
  "main": "./lib/ingest.js",
  "files": [
    "bin",
    "lib"
  ],
  "engines": {
    "node": ">=18"
  },
  "scripts": {
    "test": "node --test test/"
  }
}
```

- [ ] **Step 2: Implement the core walking/POST logic**

Create `packages/docmate-ingest/lib/ingest.js`:

```js
"use strict";

const fs = require("fs");
const path = require("path");

function toPosixPath(p) {
  return p.split(path.sep).join("/");
}

/**
 * Recursively collects every `.md` file under `dir`, skipping dotfiles/dotdirs.
 * Returns [{ path, content }] with POSIX-style paths relative to `dir`.
 */
function collectMarkdownFiles(dir, baseDir) {
  baseDir = baseDir || dir;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files = files.concat(collectMarkdownFiles(fullPath, baseDir));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      const relativePath = toPosixPath(path.relative(baseDir, fullPath));
      const content = fs.readFileSync(fullPath, "utf8");
      files.push({ path: relativePath, content });
    }
  }

  return files;
}

/**
 * Reads every markdown file under `dir` and POSTs them to a Docmate
 * documentation project's ingestion endpoint.
 *
 * @param {object} options
 * @param {string} options.url - Docmate base URL, e.g. "https://docs.example.com"
 * @param {string} options.token - Ingestion token from the documentation's admin panel
 * @param {string} options.dir - Path to the docs folder to sync
 * @param {string} [options.version] - Override the documentation version
 * @param {boolean} [options.isPublic] - Override the public visibility
 * @param {typeof fetch} [options.fetchImpl] - Injectable fetch, for testing
 */
async function ingest(options) {
  const { url, token, dir, version, isPublic } = options;
  const fetchImpl = options.fetchImpl || fetch;

  if (!url) throw new Error("Missing required option: url");
  if (!token) throw new Error("Missing required option: token");
  if (!dir) throw new Error("Missing required option: dir");

  const files = collectMarkdownFiles(dir);

  if (files.length === 0) {
    throw new Error(`No markdown files found under ${dir}`);
  }

  const body = { files };
  if (version !== undefined) body.version = version;
  if (isPublic !== undefined) body.isPublic = isPublic;

  const endpoint = `${url.replace(/\/$/, "")}/v1/external-docs/ingest-markdown`;

  const res = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Ingestion failed with status ${res.status}`);
  }

  return data;
}

module.exports = { collectMarkdownFiles, ingest };
```

- [ ] **Step 3: Implement the CLI entry point**

Create `packages/docmate-ingest/bin/docmate-ingest.js`:

```js
#!/usr/bin/env node
"use strict";

const { ingest } = require("../lib/ingest");

function parseArgs(argv) {
  const args = { url: process.env.DOCMATE_URL, token: process.env.DOCMATE_TOKEN };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--url") args.url = argv[++i];
    else if (arg === "--token") args.token = argv[++i];
    else if (arg === "--dir") args.dir = argv[++i];
    else if (arg === "--version") args.version = argv[++i];
    else if (arg === "--public") args.isPublic = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
  }

  return args;
}

function printUsage() {
  console.log(`Usage: docmate-ingest --url <docmate-url> --token <ingestion-token> --dir <docs-folder> [--version <version>] [--public]

Environment variables DOCMATE_URL and DOCMATE_TOKEN can be used instead of --url/--token.`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.dir) {
    printUsage();
    process.exit(args.help ? 0 : 1);
  }

  if (!args.url || !args.token) {
    console.error("Error: --url/DOCMATE_URL and --token/DOCMATE_TOKEN are required");
    printUsage();
    process.exit(1);
  }

  try {
    const result = await ingest(args);
    console.log(`Ingested ${result.createdItems} sidebar item(s) into documentation ${result.docId}`);
  } catch (error) {
    console.error(`Ingestion failed: ${error.message}`);
    process.exit(1);
  }
}

main();
```

- [ ] **Step 4: Make the CLI executable and sanity-check it**

Run: `chmod +x packages/docmate-ingest/bin/docmate-ingest.js` (skip on Windows)
Run: `node packages/docmate-ingest/bin/docmate-ingest.js --help`
Expected: prints the usage text and exits 0

- [ ] **Step 5: Commit**

```bash
git add packages/docmate-ingest/package.json packages/docmate-ingest/lib/ingest.js packages/docmate-ingest/bin/docmate-ingest.js
git commit -m "feat: add docmate-ingest npm package (CLI + library)"
```

---

### Task 8: `docmate-ingest` package tests and README

**Files:**
- Test: `packages/docmate-ingest/test/ingest.test.js`
- Create: `packages/docmate-ingest/README.md`

**Interfaces:**
- Consumes: `collectMarkdownFiles`, `ingest` from `../lib/ingest` (Task 7).

- [ ] **Step 1: Write the failing tests**

Create `packages/docmate-ingest/test/ingest.test.js`:

```js
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { collectMarkdownFiles, ingest } = require("../lib/ingest");

function makeTempDocsDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "docmate-ingest-test-"));
  fs.writeFileSync(path.join(dir, "1-intro.md"), "# Intro");
  fs.mkdirSync(path.join(dir, "2-api"));
  fs.writeFileSync(path.join(dir, "2-api", "1-auth.md"), "# Auth");
  fs.writeFileSync(path.join(dir, "notes.txt"), "ignore me");
  fs.mkdirSync(path.join(dir, ".hidden"));
  fs.writeFileSync(path.join(dir, ".hidden", "secret.md"), "# skip me");
  return dir;
}

test("collectMarkdownFiles finds nested markdown files with posix paths, skipping non-md and dotfiles", () => {
  const dir = makeTempDocsDir();
  const files = collectMarkdownFiles(dir).sort((a, b) => a.path.localeCompare(b.path));

  assert.deepEqual(
    files.map((f) => f.path),
    ["1-intro.md", "2-api/1-auth.md"]
  );
  assert.equal(files[0].content, "# Intro");

  fs.rmSync(dir, { recursive: true, force: true });
});

test("ingest posts collected files as JSON with a bearer token", async () => {
  const dir = makeTempDocsDir();
  let capturedUrl;
  let capturedInit;

  const fakeFetch = async (url, init) => {
    capturedUrl = url;
    capturedInit = init;
    return {
      ok: true,
      status: 200,
      json: async () => ({ success: true, docId: 42, createdItems: 2 }),
    };
  };

  const result = await ingest({
    url: "https://docs.example.com/",
    token: "abc123",
    dir,
    version: "1.2.0",
    fetchImpl: fakeFetch,
  });

  assert.equal(capturedUrl, "https://docs.example.com/v1/external-docs/ingest-markdown");
  assert.equal(capturedInit.headers.Authorization, "Bearer abc123");

  const body = JSON.parse(capturedInit.body);
  assert.equal(body.version, "1.2.0");
  assert.equal(body.files.length, 2);

  assert.deepEqual(result, { success: true, docId: 42, createdItems: 2 });

  fs.rmSync(dir, { recursive: true, force: true });
});

test("ingest throws with the server's error message on a failed response", async () => {
  const dir = makeTempDocsDir();
  const fakeFetch = async () => ({
    ok: false,
    status: 401,
    json: async () => ({ error: "Unauthorized: Invalid token" }),
  });

  await assert.rejects(
    () => ingest({ url: "https://docs.example.com", token: "bad", dir, fetchImpl: fakeFetch }),
    /Unauthorized: Invalid token/
  );

  fs.rmSync(dir, { recursive: true, force: true });
});

test("ingest throws when the docs directory has no markdown files", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "docmate-ingest-empty-"));

  await assert.rejects(
    () => ingest({ url: "https://docs.example.com", token: "abc", dir, fetchImpl: async () => ({}) }),
    /No markdown files found/
  );

  fs.rmSync(dir, { recursive: true, force: true });
});
```

- [ ] **Step 2: Run the tests**

Run: `cd packages/docmate-ingest && node --test test/`
Expected: PASS (4 tests). These exercise only the local filesystem and a stubbed `fetch` — no backend server or database needed.

- [ ] **Step 3: Write the package README**

Create `packages/docmate-ingest/README.md`:

```markdown
# docmate-ingest

Sync a project's markdown docs folder into a [Docmate](../../README.md) documentation project — designed to run from CI on every push.

Docmate never clones your repository; this tool reads your local files and POSTs their contents to your Docmate instance.

## Usage

\`\`\`bash
npx docmate-ingest --url https://docs.example.com --token <ingestion-token> --dir ./docs
\`\`\`

Or via environment variables:

\`\`\`bash
DOCMATE_URL=https://docs.example.com DOCMATE_TOKEN=<ingestion-token> npx docmate-ingest --dir ./docs
\`\`\`

### Options

| Flag         | Env var         | Required | Description                                 |
| ------------ | --------------- | -------- | -------------------------------------------- |
| `--url`      | `DOCMATE_URL`   | Yes      | Base URL of your Docmate instance             |
| `--token`    | `DOCMATE_TOKEN` | Yes      | Ingestion token from the doc's admin panel    |
| `--dir`      | —               | Yes      | Path to the docs folder to sync               |
| `--version`  | —               | No       | Override the documentation version            |
| `--public`   | —               | No       | Mark the documentation public                 |

### Ordering pages

Prefix any file or folder with `N-` to control sidebar order, e.g. `1-getting-started.md`, `2-api/1-authentication.md`. See the main [Import Guide](../../docs/IMPORT_GUIDE.md#controlling-sidebar-order).

### GitHub Actions example

\`\`\`yaml
- name: Sync docs to Docmate
  run: npx docmate-ingest --dir ./docs
  env:
    DOCMATE_URL: ${{ secrets.DOCMATE_URL }}
    DOCMATE_TOKEN: ${{ secrets.DOCMATE_TOKEN }}
\`\`\`

## Library usage

\`\`\`js
const { ingest } = require("docmate-ingest");

await ingest({
  url: "https://docs.example.com",
  token: process.env.DOCMATE_TOKEN,
  dir: "./docs",
});
\`\`\`
```

- [ ] **Step 4: Commit**

```bash
git add packages/docmate-ingest/test/ingest.test.js packages/docmate-ingest/README.md
git commit -m "test: cover docmate-ingest package and document its usage"
```

---

### Task 9: Documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/IMPORT_GUIDE.md`

- [ ] **Step 1: Document the numeric-prefix convention in `docs/IMPORT_GUIDE.md`**

In `docs/IMPORT_GUIDE.md`, after the `#### \`pages/\` (Required)` subsection (after the line "You can build multi-level nested folders. Docmate parses folder names and generates nested parent directories/collapsibles in your frontend sidebar automatically.") and before `#### \`openapi.json\` (Optional)`, insert:

```markdown
##### Controlling sidebar order

By default, pages and folders appear in the order Docmate happens to read them from the archive. To pin an exact order, prefix any file or folder name with a number and a hyphen:

```text
pages/
├── 1-getting-started.md
├── 2-authentication.md
└── 3-advanced-usage/
    ├── 1-setup.md
    └── 2-troubleshooting.md
```

The number sets the sidebar position and is stripped from the title (`2-authentication.md` → "Authentication"). Numbers only need to sort correctly relative to their siblings — gaps like `1, 5, 10` are fine. Files without a prefix keep the default archive-order behavior. Docmate's own Markdown export (`GET /:id/export/markdown`) always writes numbered files, so an exported ZIP re-imports with the same order.
```

- [ ] **Step 2: Add a new "External Markdown Ingestion" section to `README.md`**

In `README.md`, after the existing "## External Ingestion API" section ends (after the Responses table, before `---` / `## Publishing to Docker Hub`, i.e. after line 249), insert:

```markdown
## External Markdown Ingestion

Sync a project's own `docs` folder into a Docmate documentation project from CI, a git hook, or any script — Docmate never clones your repository; your script reads the files and posts their contents.

### Quick start: `docmate-ingest`

The easiest way to use this is the [`docmate-ingest`](./packages/docmate-ingest/README.md) npm package, which handles walking your docs folder and building the request for you:

```bash
npx docmate-ingest --url https://docs.example.com --token <ingestion-token> --dir ./docs
```

The rest of this section documents the underlying HTTP contract directly, for other languages/tooling.

### Setup

Same as OpenAPI ingestion above: open the documentation project, enable **Ingestion**, and copy the **Ingestion Token**.

### Endpoint

```
POST /v1/external-docs/ingest-markdown
```

### Authentication

```
Authorization: Bearer <ingestion-token>
```

### Request Body

| Field         | Type                                  | Required | Description                                   |
| ------------- | -------------------------------------- | -------- | ---------------------------------------------- |
| `files`       | `{ path: string; content: string }[]` | Yes      | Every markdown file, with its path relative to your docs folder |
| `version`     | `string`                              | No       | Override the documentation version             |
| `isPublic`    | `boolean`                             | No       | Override the public visibility                 |

Each ingest **replaces** the project's existing pages and folders with the files sent in that request — send your full docs folder every time, not just the files that changed.

File names may carry a `N-` ordering prefix, same as [the ZIP import format](./docs/IMPORT_GUIDE.md) — e.g. `1-getting-started.md`, `2-api/1-authentication.md` — to control sidebar order; the prefix is stripped from the displayed title.

### Example

Given a repo with:

```text
docs/
├── 1-getting-started.md
└── 2-api/
    └── 1-authentication.md
```

a CI step could POST:

```bash
curl -X POST http://localhost:8000/v1/external-docs/ingest-markdown \
  -H "Authorization: Bearer your-ingestion-token" \
  -H "Content-Type: application/json" \
  -d '{
    "version": "1.4.0",
    "files": [
      { "path": "1-getting-started.md", "content": "# Getting Started\n\n..." },
      { "path": "2-api/1-authentication.md", "content": "# Authentication\n\n..." }
    ]
  }'
```

### Responses

| Status | Description                                      |
| ------ | ------------------------------------------------ |
| `200`  | Documentation updated successfully                |
| `400`  | Missing/empty `files`, or no markdown files found |
| `401`  | Missing or invalid ingestion token               |
| `403`  | Ingestion is disabled for this documentation     |
| `500`  | Internal server error                            |
```

- [ ] **Step 3: Commit**

```bash
git add README.md docs/IMPORT_GUIDE.md
git commit -m "docs: document numeric ordering prefixes and the markdown ingestion endpoint"
```

---

## Self-Review Notes

- **Spec coverage:** numeric-prefix ordering on export ✅ (Task 3), on import/round-trip ✅ (Tasks 1–2, 4), git-style ingestion endpoint reusing the existing token model ✅ (Task 5), tests for auth + replace-on-reingest ✅ (Task 6), a zero-dependency client so developers don't hand-write the payload-building glue ✅ (Tasks 7–8), user-facing docs for both the raw endpoint and the client package ✅ (Task 9).
- **Type consistency:** `ParsedSidebarItem`/`ParsedPage` (Task 1) flow unchanged into `ImportSidebarItem`/`ImportPage` (Task 2 type aliases) into `importSidebarItems`'s existing signature; `orderedSegment`/`parseOrderedSegment` names and signatures are identical everywhere they're referenced (Tasks 1, 3, 5). `docmate-ingest`'s `{path, content}` file shape (Task 7) matches the `files` field of `markdownIngestionSchema` (Task 5) exactly.
- **No placeholders:** every step above contains complete, runnable code.
