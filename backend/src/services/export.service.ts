import { eq, and, isNull, desc, inArray } from 'drizzle-orm';
import db from '../db';
import {
  documentations,
  sidebarItems,
  pages,
  openApiSpecs,
  users,
  type Documentation,
  type SidebarItem,
  type Page,
  type OpenApiSpec
} from '../db/schema';
import jsPDF from 'jspdf';
import { marked } from 'marked';
import archiver from 'archiver';
import { Readable } from 'stream';

// Types for export data structures
interface ExportPage {
  id: number;
  title: string;
  slug: string;
  content: any;
  metadata: any;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ExportSidebarItem {
  id: number;
  title: string;
  type: 'folder' | 'page' | 'divider';
  order: number;
  icon?: string;
  children: ExportSidebarItem[];
  page?: ExportPage;
}

interface ExportDocument {
  id: number;
  title: string;
  description?: string | null;
  version: string;
  isPublic: boolean;
  type: 'traditional' | 'api' | 'mixed';
  baseUrl?: string | null;
  showApiEndpointsInSidebar: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: {
    name: string;
    email: string;
  } | null;
  sidebarItems: ExportSidebarItem[];
  openApiSpecs?: OpenApiSpec[];
}

class ExportService {
  /**
   * Get complete document data for export
   */
  async getDocumentForExport(documentId: number, userId?: number): Promise<ExportDocument | null> {
    try {
      // Get documentation with creator
      const docResult = await db
        .select({
          id: documentations.id,
          title: documentations.title,
          description: documentations.description,
          version: documentations.version,
          isPublic: documentations.isPublic,
          type: documentations.type,
          baseUrl: documentations.baseUrl,
          showApiEndpointsInSidebar: documentations.showApiEndpointsInSidebar,
          createdAt: documentations.createdAt,
          updatedAt: documentations.updatedAt,
          createdBy: {
            name: users.name,
            email: users.email
          }
        })
        .from(documentations)
        .leftJoin(users, eq(documentations.createdBy, users.id))
        .where(eq(documentations.id, documentId))
        .limit(1);

      if (docResult.length === 0) {
        return null;
      }

      const doc = docResult[0];

      // Get sidebar items (only non-deleted)
      const sidebarItemsResult = await db
        .select({
          id: sidebarItems.id,
          title: sidebarItems.title,
          type: sidebarItems.type,
          order: sidebarItems.order,
          icon: sidebarItems.icon,
          parentId: sidebarItems.parentId
        })
        .from(sidebarItems)
        .where(and(
          eq(sidebarItems.documentationId, documentId),
          isNull(sidebarItems.deletedAt)
        ))
        .orderBy(sidebarItems.order);

      // Get pages for sidebar items
      const sidebarItemIds = sidebarItemsResult.map(item => item.id);

      // Actually get all pages for all sidebar items
      const allPagesResult = sidebarItemIds.length > 0 ? await db
        .select()
        .from(pages)
        .where(inArray(pages.sidebarItemId, sidebarItemIds)) : [];

      // Get OpenAPI specs
      const openApiSpecsResult = await db
        .select()
        .from(openApiSpecs)
        .where(eq(openApiSpecs.documentationId, documentId))
        .orderBy(desc(openApiSpecs.createdAt));

      // Build hierarchical sidebar structure
      const buildSidebarTree = (items: any[], parentId: number | null = null): ExportSidebarItem[] => {
        return items
          .filter(item => item.parentId === parentId)
          .sort((a, b) => a.order - b.order)
          .map(item => {
            const page = allPagesResult.find(p => p.sidebarItemId === item.id);
            return {
              id: item.id,
              title: item.title,
              type: item.type,
              order: item.order,
              icon: item.icon,
              children: buildSidebarTree(items, item.id),
              page: page ? {
                id: page.id,
                title: item.title,
                slug: page.slug,
                content: page.content,
                metadata: page.metadata,
                createdAt: page.createdAt,
                updatedAt: page.updatedAt,
                order: item.order
              } : undefined
            };
          });
      };

      const sidebarTree = buildSidebarTree(sidebarItemsResult);

      return {
        ...doc,
        version: doc.version || '1.0.0',
        type: doc.type as 'mixed' | 'traditional' | 'api',
        showApiEndpointsInSidebar: doc.showApiEndpointsInSidebar ?? true,
        sidebarItems: sidebarTree,
        openApiSpecs: openApiSpecsResult
      };

    } catch (error) {
      console.error('Error fetching document for export:', error);
      throw new Error('Failed to fetch document for export');
    }
  }

  /**
   * Generate markdown files for a document
   */
  async generateMarkdownExport(documentId: number): Promise<{ files: Array<{ path: string; content: string }> }> {
    const document = await this.getDocumentForExport(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    const files: Array<{ path: string; content: string }> = [];

    // Generate human-readable index.md
    const indexContent = this.generateReadableIndexMarkdown(document);
    files.push({ path: '_index.md', content: indexContent });

    // Generate metadata.json for import
    const metadata = {
      title: document.title,
      description: document.description || '',
      version: document.version,
      type: document.type,
      isPublic: document.isPublic,
      showApiEndpointsInSidebar: document.showApiEndpointsInSidebar,
      ...(document.baseUrl && { baseUrl: document.baseUrl })
    };
    files.push({ path: '_metadata.json', content: JSON.stringify(metadata, null, 2) });

    // Generate openapi.md if specs exist
    if (document.openApiSpecs && document.openApiSpecs.length > 0) {
      const openApiContent = this.generateOpenApiMarkdown(document.openApiSpecs);
      files.push({ path: 'openapi.md', content: openApiContent });

      // Also export OpenAPI as JSON for mixed documents
      if (document.type === 'mixed' || document.type === 'api') {
        const latestSpec = document.openApiSpecs[0];
        const openApiJson = JSON.stringify(latestSpec.rawSpec || latestSpec, null, 2);
        files.push({ path: 'openapi.json', content: openApiJson });
      }
    }

    // Generate markdown for each page
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

    generatePageMarkdown(document.sidebarItems);

    return { files };
  }

  /**
   * Generate human-readable index.md content (no metadata)
   */
  private generateReadableIndexMarkdown(document: ExportDocument): string {
    return `# ${document.title}

${document.description ? document.description + '\n' : ''}

## Document Information

- **Version**: ${document.version}
- **Type**: ${document.type}
- **Created**: ${document.createdAt.toLocaleDateString()}
- **Last Updated**: ${document.updatedAt.toLocaleDateString()}
- **Created By**: ${document.createdBy?.name || 'Unknown'} (${document.createdBy?.email || 'unknown@example.com'})
${document.baseUrl ? `- **Base URL**: ${document.baseUrl}` : ''}

${document.isPublic ? '📖 **Public Document**' : '🔒 **Private Document**'}

---

## Table of Contents

${this.generateTableOfContents(document.sidebarItems)}

${document.openApiSpecs && document.openApiSpecs.length > 0 ? `
## API Documentation

This document includes OpenAPI specifications:
- [openapi.md](./openapi.md) - Human-readable API reference
- [openapi.json](./openapi.json) - Machine-readable OpenAPI specification

` : ''}

---

*This document was exported from the documentation platform on ${new Date().toISOString()}*`;
  }

  /**
   * Generate table of contents from sidebar items
   */
  private generateTableOfContents(items: ExportSidebarItem[], level: number = 0): string {
    const indent = '  '.repeat(level);
    return items.map(item => {
      if (item.type === 'divider') {
        return `${indent}---`;
      } else if (item.type === 'page' && item.page) {
        return `${indent}- [${item.title}](./pages/${item.page.slug}.md)`;
      } else if (item.type === 'folder') {
        const folderTitle = `${indent}- ${item.title}/`;
        const children = item.children.length > 0
          ? '\n' + this.generateTableOfContents(item.children, level + 1)
          : '';
        return folderTitle + children;
      }
      return '';
    }).join('\n');
  }

  /**
   * Generate markdown for a single page
   */
  private generatePageMarkdown(page: ExportPage, document: ExportDocument): string {
    const frontmatter = `---
title: "${page.title || 'Untitled Page'}"
slug: "${page.slug || 'untitled'}"
document_id: ${document.id}
document_title: "${document.title}"
created_at: "${page.createdAt?.toISOString() || new Date().toISOString()}"
updated_at: "${page.updatedAt?.toISOString() || new Date().toISOString()}"
---

`;

    const content = page.content ? this.processContentToMarkdown(page.content) : '';
    return frontmatter + content;
  }

  /**
   * Convert rich content to markdown
   */
  private processContentToMarkdown(content: any): string {
    if (typeof content === 'string') {
      return content;
    }

    // Handle content object with description field (like in the logs)
    if (content && typeof content === 'object') {
      let result = '';

      // If there's a description field, use it as the main content
      if (content.description) {
        result += this.processEmbeddedMarkdown(content.description);
      }

      // If there are blocks in an array, process them
      if (content.blocks && Array.isArray(content.blocks) && content.blocks.length > 0) {
        if (result) result += '\n\n'; // Add spacing if we already have description
        result += content.blocks.map((block: any) => this.contentBlockToMarkdown(block)).join('\n\n');
      }

      // If it's a single block object (not an array of blocks)
      if (!content.blocks || !Array.isArray(content.blocks)) {
        const blockResult = this.contentBlockToMarkdown(content);
        if (blockResult) {
          if (result) result += '\n\n';
          result += blockResult;
        }
      }

      return result;
    }

    if (Array.isArray(content)) {
      return content.map(block => this.contentBlockToMarkdown(block)).join('\n\n');
    }

    return '';
  }

  /**
   * Process embedded markdown content (handles code blocks, etc.)
   */
  private processEmbeddedMarkdown(content: string): string {
    if (!content || typeof content !== 'string') {
      return '';
    }

    // The content appears to already be in proper markdown format
    // with code blocks, headers, lists, etc. Just return it as-is.
    return content;
  }

  /**
   * Convert content block to markdown
   */
  private contentBlockToMarkdown(block: { [key: string]: any }): string {
    if (!block || typeof block !== 'object') {
      return '';
    }

    switch (block.type) {
      case 'heading':
        const level = '#'.repeat(block.level || 1);
        return `${level} ${block.text || ''}`;

      case 'paragraph':
        return block.text || '';

      case 'code':
        const language = block.language || '';
        const code = block.code || '';
        return `\`\`\`${language}\n${code}\n\`\`\``;

      case 'list':
        if (block.ordered) {
          return (block.items || []).map((item: any, index: number) => `${index + 1}. ${item}`).join('\n');
        } else {
          return (block.items || []).map((item: any) => `- ${item}`).join('\n');
        }

      case 'quote':
        return `> ${block.text || ''}`;

      case 'image':
        const alt = block.alt || '';
        const src = block.src || '';
        return `![${alt}](${src})`;

      case 'link':
        const linkText = block.text || '';
        const href = block.href || '';
        return `[${linkText}](${href})`;

      default:
        return block.text || '';
    }
  }

  /**
   * Generate OpenAPI markdown
   */
  private generateOpenApiMarkdown(specs: OpenApiSpec[]): string {
    if (specs.length === 0) return '';

    const latestSpec = specs[0]; // Assuming specs are ordered by creation date desc
    const info = latestSpec.info as any;

    let content = `# API Documentation

${info.description || ''}

**OpenAPI Version**: ${latestSpec.specVersion}
**API Version**: ${info.version || '1.0.0'}

`;

    if (latestSpec.servers) {
      content += `## Servers

`;
      (latestSpec.servers as any[]).forEach((server: any, index: number) => {
        content += `${index + 1}. **${server.description || 'Default'}**: \`${server.url}\`\n`;
      });
      content += '\n';
    }

    if (latestSpec.paths) {
      content += `## Endpoints

`;
      const paths = latestSpec.paths as any;
      Object.keys(paths).forEach(path => {
        const pathItem = paths[path];
        content += `### ${path}

`;
        ['get', 'post', 'put', 'delete', 'patch'].forEach(method => {
          if (pathItem[method]) {
            const operation = pathItem[method];
            content += `#### ${method.toUpperCase()} ${path}

${operation.summary || ''}

${operation.description || ''}

`;
            if (operation.parameters && operation.parameters.length > 0) {
              content += `**Parameters:**

| Name | In | Type | Required | Description |
|------|----|------|----------|-------------|
`;
              operation.parameters.forEach((param: any) => {
                content += `| ${param.name} | ${param.in} | ${param.schema?.type || 'string'} | ${param.required ? 'Yes' : 'No'} | ${param.description || '-'} |\n`;
              });
              content += '\n';
            }

            if (operation.responses) {
              content += `**Responses:**

`;
              Object.keys(operation.responses).forEach(statusCode => {
                const response = operation.responses[statusCode];
                content += `- **${statusCode}**: ${response.description || 'No description'}\n`;
              });
              content += '\n';
            }
          }
        });
      });
    }

    return content;
  }

  /**
   * Generate PDF export using jsPDF
   */
  async generatePDFExport(documentId: number): Promise<Buffer> {
    const document = await this.getDocumentForExport(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    const pdf = new jsPDF();
    let yPosition = 20;
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 20;
    const lineHeight = 7;

    // Helper function to add new page if needed
    const checkPageBreak = (requiredHeight: number) => {
      if (yPosition + requiredHeight > pageHeight - margin) {
        pdf.addPage();
        yPosition = 20;
      }
    };

    // Add title page
    pdf.setFontSize(24);
    pdf.text(document.title, margin, yPosition);
    yPosition += lineHeight * 2;

    pdf.setFontSize(12);
    if (document.description) {
      checkPageBreak(lineHeight * 3);
      const splitDescription = pdf.splitTextToSize(document.description, pdf.internal.pageSize.width - 2 * margin);
      pdf.text(splitDescription, margin, yPosition);
      yPosition += splitDescription.length * lineHeight;
    }

    yPosition += lineHeight;
    checkPageBreak(lineHeight * 5);

    pdf.setFontSize(14);
    pdf.text('Document Information', margin, yPosition);
    yPosition += lineHeight * 1.5;

    pdf.setFontSize(10);
    const info = [
      `Version: ${document.version}`,
      `Type: ${document.type}`,
      `Created: ${document.createdAt.toLocaleDateString()}`,
      `Last Updated: ${document.updatedAt.toLocaleDateString()}`,
      `Created By: ${document.createdBy?.name || 'Unknown'} (${document.createdBy?.email || 'unknown@example.com'})`,
      document.baseUrl ? `Base URL: ${document.baseUrl}` : '',
      document.isPublic ? 'Public Document' : 'Private Document'
    ].filter(Boolean);

    info.forEach(line => {
      checkPageBreak(lineHeight);
      pdf.text(line, margin, yPosition);
      yPosition += lineHeight;
    });

    // Add table of contents
    pdf.addPage();
    yPosition = 20;
    pdf.setFontSize(16);
    pdf.text('Table of Contents', margin, yPosition);
    yPosition += lineHeight * 2;

    const addTOCItem = (items: ExportSidebarItem[], level: number = 0) => {
      items.forEach(item => {
        if (item.type === 'page' && item.page) {
          checkPageBreak(lineHeight);
          const indent = '  '.repeat(level);
          pdf.text(`${indent}- ${item.title}`, margin + (level * 10), yPosition);
          yPosition += lineHeight;
        } else if (item.type === 'folder') {
          checkPageBreak(lineHeight);
          const indent = '  '.repeat(level);
          pdf.text(`${indent}+ ${item.title}/`, margin + (level * 10), yPosition);
          yPosition += lineHeight;
          if (item.children.length > 0) {
            addTOCItem(item.children, level + 1);
          }
        }
      });
    };

    pdf.setFontSize(10);
    addTOCItem(document.sidebarItems);

    // Add pages content
    const addPageContent = (items: ExportSidebarItem[]) => {
      items.forEach(item => {
        if (item.type === 'page' && item.page) {
          pdf.addPage();
          yPosition = 20;

          pdf.setFontSize(14);
          pdf.text(item.title, margin, yPosition);
          yPosition += lineHeight * 2;

          pdf.setFontSize(10);
          const content = this.processContentToMarkdown(item.page.content);
          if (content) {
            const plainText = content.replace(/[#*`]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
            const splitContent = pdf.splitTextToSize(plainText, pdf.internal.pageSize.width - 2 * margin);

            splitContent.forEach((line: string) => {
              checkPageBreak(lineHeight);
              pdf.text(line, margin, yPosition);
              yPosition += lineHeight;
            });
          }
        } else if (item.type === 'folder' && item.children.length > 0) {
          addPageContent(item.children);
        }
      });
    };

    addPageContent(document.sidebarItems);

    // Add OpenAPI specs if available
    if (document.openApiSpecs && document.openApiSpecs.length > 0) {
      pdf.addPage();
      yPosition = 20;

      pdf.setFontSize(16);
      pdf.text('API Documentation', margin, yPosition);
      yPosition += lineHeight * 2;

      const latestSpec = document.openApiSpecs[0];
      const info = latestSpec.info as any;

      pdf.setFontSize(10);
      pdf.text(`OpenAPI Version: ${latestSpec.specVersion}`, margin, yPosition);
      yPosition += lineHeight;
      pdf.text(`API Version: ${info.version || '1.0.0'}`, margin, yPosition);
      yPosition += lineHeight * 2;

      if (info.description) {
        const splitDesc = pdf.splitTextToSize(info.description, pdf.internal.pageSize.width - 2 * margin);
        splitDesc.forEach((line: string) => {
          checkPageBreak(lineHeight);
          pdf.text(line, margin, yPosition);
          yPosition += lineHeight;
        });
      }
    }

    return Buffer.from(pdf.output('arraybuffer'));
  }

  /**
   * Create a ZIP archive from markdown files
   */
  async createMarkdownZip(documentId: number): Promise<Buffer> {
    const { files } = await this.generateMarkdownExport(documentId);

    return new Promise((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 9 } });
      const buffers: Buffer[] = [];

      archive.on('data', (chunk) => {
        buffers.push(chunk);
      });

      archive.on('end', () => {
        resolve(Buffer.concat(buffers));
      });

      archive.on('error', (err) => {
        reject(err);
      });

      // Add files to archive
      files.forEach(file => {
        archive.append(file.content, { name: file.path });
      });

      archive.finalize();
    });
  }
}

export default new ExportService();