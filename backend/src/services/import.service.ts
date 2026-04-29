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

interface ImportMetadata {
  title: string;
  description?: string;
  version: string;
  type: "traditional" | "api" | "mixed";
  isPublic: boolean;
  showApiEndpointsInSidebar: boolean;
  baseUrl?: string;
}

class ImportService {
  /**
   * Import document from JSON file
   */
  async importFromJson(
    jsonData: any,
    userId: number,
    documentId?: number
  ): Promise<{ document: Documentation; createdItems: number }> {
    try {
      // Validate JSON structure
      if (!jsonData.title || !jsonData.sidebarItems) {
        throw new Error("Invalid JSON format: missing required fields");
      }

      let document: Documentation;

      if (documentId) {
        // Update existing document
        const existingDoc = await db.query.documentations.findFirst({
          where: eq(documentations.id, documentId),
        });

        if (!existingDoc) {
          throw new Error("Document not found");
        }

        // Clear existing sidebar items and pages
        await this.deleteDocumentContent(documentId);

        // Update document metadata
        const [updatedDoc] = await db
          .update(documentations)
          .set({
            title: jsonData.title,
            description: jsonData.description || null,
            version: jsonData.version || "1.0.0",
            type: jsonData.type || "traditional",
            isPublic: jsonData.isPublic || false,
            baseUrl: jsonData.baseUrl || null,
            showApiEndpointsInSidebar: jsonData.showApiEndpointsInSidebar || false,
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
            title: jsonData.title,
            description: jsonData.description || null,
            version: jsonData.version || "1.0.0",
            type: jsonData.type || "traditional",
            isPublic: jsonData.isPublic || false,
            baseUrl: jsonData.baseUrl || null,
            showApiEndpointsInSidebar: jsonData.showApiEndpointsInSidebar || false,
            createdBy: userId,
          })
          .returning();

        document = newDoc;
      }

      // Import sidebar items and pages
      const createdItems = await this.importSidebarItems(jsonData.sidebarItems, document.id, null);

      // Import OpenAPI specs if available
      if (jsonData.openApiSpecs && jsonData.openApiSpecs.length > 0) {
        await this.importOpenApiSpecs(jsonData.openApiSpecs, document.id);
      }

      return { document, createdItems };
    } catch (error) {
      console.error("Error importing JSON:", error);
      throw new Error(
        `JSON import failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Import document from ZIP file
   */
  async importFromZip(
    zipBuffer: Buffer,
    userId: number,
    documentId?: number
  ): Promise<{ document: Documentation; createdItems: number }> {
    try {
      const files: { [key: string]: Buffer } = {};

      // Extract ZIP file
      const extractedFiles = await this.extractZip(zipBuffer);

      // Validate required files
      if (!extractedFiles["_metadata.json"]) {
        throw new Error("Invalid ZIP file: missing _metadata.json");
      }

      if (!extractedFiles["_index.md"]) {
        throw new Error("Invalid ZIP file: missing _index.md");
      }

      // Parse metadata
      const metadata: ImportMetadata = JSON.parse(extractedFiles["_metadata.json"].toString());

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

      // Import OpenAPI spec if available
      if (extractedFiles["openapi.json"]) {
        try {
          const openApiSpec = JSON.parse(extractedFiles["openapi.json"].toString());
          await this.importOpenApiSpecs([openApiSpec], document.id);
        } catch (error) {
          console.warn("Failed to parse OpenAPI spec:", error);
          // Don't fail the import if OpenAPI spec is invalid
        }
      }

      return { document, createdItems };
    } catch (error) {
      console.error("Error importing ZIP:", error);
      throw new Error(
        `ZIP import failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Extract ZIP file using yauzl
   */
  private async extractZip(zipBuffer: Buffer): Promise<{ [key: string]: Buffer }> {
    return new Promise((resolve, reject) => {
      const files: { [key: string]: Buffer } = {};

      yauzl.fromBuffer(zipBuffer, { lazyEntries: true }, (err, zipfile) => {
        if (err) {
          reject(err);
          return;
        }

        if (!zipfile) {
          reject(new Error("Invalid ZIP file"));
          return;
        }

        zipfile.readEntry();

        zipfile.on("entry", (entry) => {
          if (/\/$/.test(entry.fileName)) {
            // Directory entry
            zipfile.readEntry();
          } else {
            // File entry
            zipfile.openReadStream(entry, (err, readStream) => {
              if (err) {
                reject(err);
                return;
              }

              if (!readStream) {
                zipfile.readEntry();
                return;
              }

              const chunks: Buffer[] = [];
              readStream.on("data", (chunk) => {
                chunks.push(chunk);
              });

              readStream.on("end", () => {
                files[entry.fileName] = Buffer.concat(chunks);
                zipfile.readEntry();
              });

              readStream.on("error", (err) => {
                reject(err);
              });
            });
          }
        });

        zipfile.on("end", () => {
          resolve(files);
        });

        zipfile.on("error", (err) => {
          reject(err);
        });
      });
    });
  }

  /**
   * Build sidebar structure from markdown files
   */
  private buildSidebarFromMarkdown(files: { [key: string]: Buffer }): ImportSidebarItem[] {
    const rootSidebarItems: ImportSidebarItem[] = [];
    const folderMap = new Map<string, ImportSidebarItem>();
    let order = 0;

    // Find all page files
    const pageFiles = Object.keys(files).filter(
      (filename) => filename.startsWith("pages/") && filename.endsWith(".md")
    );

    pageFiles.forEach((filename) => {
      const content = files[filename].toString();
      const relativePath = filename.replace("pages/", "").replace(".md", "");
      const pathParts = relativePath.split("/");
      const pageData = this.parseMarkdownFile(content);

      let currentChildren = rootSidebarItems;
      let currentPath = "";

      // Build folder structure
      for (let i = 0; i < pathParts.length - 1; i++) {
        const folderName = pathParts[i];
        currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;

        if (!folderMap.has(currentPath)) {
          const folderItem: ImportSidebarItem = {
            id: -1, // Temporary ID
            title: folderName.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
            type: "folder",
            order: order++,
            children: [],
          };
          folderMap.set(currentPath, folderItem);
          currentChildren.push(folderItem);
        }

        currentChildren = folderMap.get(currentPath)!.children;
      }

      // Add page
      const rawPageTitle = pathParts[pathParts.length - 1];
      const pageTitle = rawPageTitle.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
      
      const pageItem: ImportSidebarItem = {
        id: -1, // Temporary ID
        title: pageData.title || pageTitle,
        type: "page",
        order: order++,
        children: [],
        page: {
          title: pageData.title || pageTitle,
          slug: pageData.slug || rawPageTitle,
          content: { description: content },
          metadata: pageData.metadata,
          created_at: pageData.created_at,
          updated_at: pageData.updated_at,
        },
      };

      currentChildren.push(pageItem);
    });

    return rootSidebarItems.sort((a, b) => a.order - b.order);
  }

  /**
   * Parse markdown file frontmatter
   */
  private parseMarkdownFile(content: string): {
    title?: string;
    slug?: string;
    metadata?: any;
    created_at?: string;
    updated_at?: string;
  } {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (match) {
      try {
        const frontmatter = match[1];
        const markdown = match[2];

        // Parse YAML frontmatter (simple key-value pairs)
        const frontmatterData: any = {};
        frontmatter.split("\n").forEach((line) => {
          const colonIndex = line.indexOf(":");
          if (colonIndex > 0) {
            const key = line.substring(0, colonIndex).trim();
            let value = line.substring(colonIndex + 1).trim();

            // Remove quotes if present
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
      }
    }

    return {};
  }

  /**
   * Import sidebar items recursively
   */
  private async importSidebarItems(
    items: ImportSidebarItem[],
    documentationId: number,
    parentId: number | null
  ): Promise<number> {
    let createdItems = 0;

    for (const item of items) {
      // Create sidebar item
      const [newSidebarItem] = await db
        .insert(sidebarItems)
        .values({
          documentationId,
          parentId,
          title: item.title,
          type: item.type,
          order: item.order,
          icon: item.icon || null,
        })
        .returning();

      createdItems++;

      // Create page if this is a page item
      if (item.type === "page" && item.page) {
        await db.insert(pages).values({
          sidebarItemId: newSidebarItem.id,
          slug: item.page.slug,
          content: item.page.content,
          metadata: item.page.metadata || {},
          createdAt: item.page.created_at ? new Date(item.page.created_at) : new Date(),
          updatedAt: item.page.updated_at ? new Date(item.page.updated_at) : new Date(),
        });
      }

      // Import children recursively
      if (item.children && item.children.length > 0) {
        createdItems += await this.importSidebarItems(
          item.children,
          documentationId,
          newSidebarItem.id
        );
      }
    }

    return createdItems;
  }

  /**
   * Import OpenAPI specs
   */
  private async importOpenApiSpecs(specs: OpenApiSpec[], documentationId: number): Promise<void> {
    for (const spec of specs) {
      await db.insert(openApiSpecs).values({
        documentationId,
        specVersion: spec.specVersion || "3.1.0",
        info: spec.info,
        servers: spec.servers || null,
        paths: spec.paths || null,
        components: spec.components || null,
        security: spec.security || null,
        tags: spec.tags || null,
        externalDocs: spec.externalDocs || null,
        rawSpec: spec.rawSpec || spec,
      });
    }
  }

  /**
   * Delete all content for a document (for updates)
   */
  private async deleteDocumentContent(documentationId: number): Promise<void> {
    // Get all sidebar items for this document
    const sidebarItemList = await db.query.sidebarItems.findMany({
      where: eq(sidebarItems.documentationId, documentationId),
    });

    const sidebarItemIds = sidebarItemList.map((item) => item.id);

    if (sidebarItemIds.length > 0) {
      // Delete pages using inArray
      await db.delete(pages).where(inArray(pages.sidebarItemId, sidebarItemIds));

      // Delete sidebar items (cascade should handle children)
      await db.delete(sidebarItems).where(eq(sidebarItems.documentationId, documentationId));
    }

    // Delete OpenAPI specs
    await db.delete(openApiSpecs).where(eq(openApiSpecs.documentationId, documentationId));
  }
}

export default new ImportService();
