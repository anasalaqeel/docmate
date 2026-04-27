import db from "../db";
import { uploads, documentations, pages } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { fileUploadService, BunFileUpload } from "./fileUploadService";

export class AttachmentsService {
  async getAttachmentsByDoc(documentationId: number) {
    return await db.query.uploads.findMany({
      where: and(
        eq(uploads.documentationId, documentationId),
        eq(uploads.type, "attachment")
      ),
      orderBy: (uploads, { desc }) => [desc(uploads.createdAt)],
    });
  }

  async getAttachmentsByPage(pageId: number) {
    return await db.query.uploads.findMany({
      where: and(
        eq(uploads.pageId, pageId),
        eq(uploads.type, "attachment")
      ),
      orderBy: (uploads, { desc }) => [desc(uploads.createdAt)],
    });
  }

  async createAttachment(
    file: BunFileUpload,
    entityType: "documentation" | "page",
    entityId: number,
    description: string | null,
    uploadedBy: number
  ) {
    // Verify entity existence
    if (entityType === "documentation") {
      const doc = await db.query.documentations.findFirst({
        where: eq(documentations.id, entityId),
      });
      if (!doc) throw new Error("Documentation not found");
    } else {
      const page = await db.query.pages.findFirst({
        where: eq(pages.id, entityId),
      });
      if (!page) throw new Error("Page not found");
    }

    // Upload physical file
    const uploadResult = await fileUploadService.uploadFile(file, "attachment");

    // Create database record
    const [newAttachment] = await db
      .insert(uploads)
      .values({
        type: "attachment",
        filename: uploadResult.filename,
        originalName: uploadResult.originalName,
        mimeType: uploadResult.mimeType,
        size: uploadResult.size,
        path: uploadResult.webPath,
        checksum: uploadResult.checksum,
        fileSignature: uploadResult.fileSignature,
        storagePath: uploadResult.storagePath,
        uploadedBy,
        documentationId: entityType === "documentation" ? entityId : null,
        pageId: entityType === "page" ? entityId : null,
        description,
      })
      .returning();

    return newAttachment;
  }

  async deleteAttachment(id: number) {
    const attachment = await db.query.uploads.findFirst({
      where: eq(uploads.id, id),
    });

    if (!attachment) throw new Error("Attachment not found");

    // Delete physical file
    await fileUploadService.deleteFile(attachment.filename);

    // Delete database record
    await db.delete(uploads).where(eq(uploads.id, id));

    return true;
  }
}

export const attachmentsService = new AttachmentsService();
