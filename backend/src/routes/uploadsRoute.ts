import { Hono } from "hono";
import { join } from "path";

const uploadsRoute = new Hono();

// GET /uploads/:type/:filename - Serve uploaded files securely
uploadsRoute.get("/:type/:filename", async (c) => {
  try {
    const type = c.req.param("type");
    const filename = c.req.param("filename");
    
    // Use absolute path for reliability
    const filePath = join(process.cwd(), "uploads", type, filename);
    const file = Bun.file(filePath);

    if (!(await file.exists())) {
      return c.json({ success: false, message: "File not found" }, 404);
    }

    // Return the file directly; Bun handles the streaming and MIME type
    return new Response(file);
  } catch (error) {
    console.error("Error serving file:", error);
    return c.json({ success: false, message: "Error serving file" }, 500);
  }
});

export default uploadsRoute;
