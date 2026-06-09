import { Hono } from "hono";
import { authorize } from "../middlewares/authorize";
import {
  uploadRateLimit,
  uploadSecurityMiddleware,
  fileValidationMiddleware,
  uploadErrorCleanup,
} from "../middlewares/uploadSecurity";
import { attachmentsService } from "../services/attachmentsService";
import { BunFileUpload } from "../services/fileUploadService";
import { sanitizeInput } from "../utils/sanitize";

const attachmentsRoute = new Hono();

// GET /attachments/docs/:docId - Get project-level attachments
attachmentsRoute.get("/docs/:docId", async (c) => {
  try {
    const docId = parseInt(c.req.param("docId"));
    const attachments = await attachmentsService.getAttachmentsByDoc(docId);
    return c.json({ success: true, data: attachments });
  } catch (error: unknown) {
    console.error("Error fetching doc attachments:", error);
    return c.json({ success: false, message: "Failed to fetch attachments" }, 500);
  }
});

// GET /attachments/pages/:pageId - Get page-level attachments
attachmentsRoute.get("/pages/:pageId", async (c) => {
  try {
    const pageId = parseInt(c.req.param("pageId"));
    const attachments = await attachmentsService.getAttachmentsByPage(pageId);
    return c.json({ success: true, data: attachments });
  } catch (error: unknown) {
    console.error("Error fetching page attachments:", error);
    return c.json({ success: false, message: "Failed to fetch attachments" }, 500);
  }
});

// POST /attachments/docs/:docId - Upload project-level attachment
attachmentsRoute.post(
  "/docs/:docId",
  authorize(["content:create"]),
  uploadRateLimit,
  uploadSecurityMiddleware,
  fileValidationMiddleware,
  uploadErrorCleanup,
  async (c) => {
    try {
      const docId = parseInt(c.req.param("docId"));
      const user = c.get("user");
      const file = c.get("validatedFile") as File;
      const rawDescription = c.req.query("description");
      const description = rawDescription ? sanitizeInput(rawDescription, "general") : null;

      const bunFile: BunFileUpload = {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified || Date.now(),
        arrayBuffer: () => file.arrayBuffer(),
        stream: () => file.stream(),
        text: () => file.text(),
      };

      const attachment = await attachmentsService.createAttachment(
        bunFile,
        "documentation",
        docId,
        description,
        user.id
      );

      return c.json({ success: true, data: attachment }, 201);
    } catch (error: unknown) {
      console.error("Error uploading doc attachment:", error);
      return c.json({ success: false, message: error instanceof Error ? error.message : "Upload failed" }, 500);
    }
  }
);

// POST /attachments/pages/:pageId - Upload page-level attachment
attachmentsRoute.post(
  "/pages/:pageId",
  authorize(["content:create"]),
  uploadRateLimit,
  uploadSecurityMiddleware,
  fileValidationMiddleware,
  uploadErrorCleanup,
  async (c) => {
    try {
      const pageId = parseInt(c.req.param("pageId"));
      const user = c.get("user");
      const file = c.get("validatedFile") as File;
      const rawDescription = c.req.query("description");
      const description = rawDescription ? sanitizeInput(rawDescription, "general") : null;

      const bunFile: BunFileUpload = {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified || Date.now(),
        arrayBuffer: () => file.arrayBuffer(),
        stream: () => file.stream(),
        text: () => file.text(),
      };

      const attachment = await attachmentsService.createAttachment(
        bunFile,
        "page",
        pageId,
        description,
        user.id
      );

      return c.json({ success: true, data: attachment }, 201);
    } catch (error: unknown) {
      console.error("Error uploading page attachment:", error);
      return c.json({ success: false, message: error instanceof Error ? error.message : "Upload failed" }, 500);
    }
  }
);

// DELETE /attachments/:id - Delete attachment
attachmentsRoute.delete("/:id", authorize(["content:manage"]), async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    await attachmentsService.deleteAttachment(id);
    return c.json({ success: true, message: "Attachment deleted" });
  } catch (error: unknown) {
    console.error("Error deleting attachment:", error);
    return c.json({ success: false, message: error instanceof Error ? error.message : "Delete failed" }, 500);
  }
});

export default attachmentsRoute;
