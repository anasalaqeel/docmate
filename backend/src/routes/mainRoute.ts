import { Hono } from "hono";
import docsRoute from "./docsRoute";

const router = new Hono();

// Health check endpoint
router.get("/", async (c) => {
  try {
    const response = {
      status: "success",
      message: "API is running successfully",
      timestamp: new Date().toISOString(),
    };
    return c.json(response);
  } catch (error) {
    console.error("Error in / route:", error);
    return c.json({ message: "Failed to fetch status" }, 500);
  }
});

router.route("/docs", docsRoute);

export default router;
