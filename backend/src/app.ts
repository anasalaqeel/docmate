import { Hono } from "hono";
import { cors } from "hono/cors";
import { swaggerUI } from "@hono/swagger-ui";
import errorLogger from "./middlewares/errorLogger";
import { productionErrorHandler } from "./middlewares/productionErrorHandler";
import mainRoute from "./routes/mainRoute";
import authRoute from "./routes/authRoute";
import docsRoute from "./routes/docsRoute";
import usersRoute from "./routes/usersRoute";
import rolesRoute from "./routes/rolesRoute";
import permissionsRoute from "./routes/permissionsRoute";
import settingsRoute from "./routes/settingsRoute";
import externalDocsRoute from "./routes/externalDocsRoute";
import attachmentsRoute from "./routes/attachmentsRoute";
import uploadsRoute from "./routes/uploadsRoute";
import proxyRoute from "./routes/proxyRoute";
import { getSpec, initializeOpenAPI } from "./utils/openApiGenerator";
import { initializeSessionCleanup } from "./utils/sessionCleanup";
import config from "config";
// Explicitly register OpenAPI documentation
import "./utils/registerRoutes";
// Import settings definitions to register them
import "./config/settings.definitions";

// Initialize OpenAPI with dynamic server URL
const appUrl = config.get<string>("appUrl") || "";
initializeOpenAPI({
  serverUrl: appUrl ? `${appUrl.replace(/\/$/, "")}/v1` : "/v1",
  serverDescription: process.env.NODE_ENV === "production" ? "Production Server" : "Development Server",
});

const app = new Hono();

// CORS configuration — must be explicitly set via CORS_ORIGINS env var or config
const rawCorsOrigins = config.get<string[] | string>("corsOrigins");
if (!rawCorsOrigins || (Array.isArray(rawCorsOrigins) && rawCorsOrigins.length === 0)) {
  throw new Error(
    "CORS_ORIGINS is not configured. Set the CORS_ORIGINS environment variable (e.g. CORS_ORIGINS=http://localhost:3000)."
  );
}
const corsOrigins = typeof rawCorsOrigins === "string"
  ? rawCorsOrigins.split(",").map((o: string) => o.trim()).filter(Boolean)
  : rawCorsOrigins;

if (corsOrigins.length === 0) {
  throw new Error(
    "CORS_ORIGINS is empty after parsing. Set the CORS_ORIGINS environment variable (e.g. CORS_ORIGINS=http://localhost:3000)."
  );
}
app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "Accept"],
    exposeHeaders: ["Content-Length", "X-Request-ID"],
    maxAge: 86400,
  })
);

app.use("*", errorLogger);
app.use("*", productionErrorHandler);

const v1 = new Hono();

v1.route("/uploads", uploadsRoute);

v1.route("/", mainRoute);
v1.route("/auth", authRoute);
v1.route("/docs", docsRoute);
v1.route("/users", usersRoute);
v1.route("/roles", rolesRoute);
v1.route("/permissions", permissionsRoute);
v1.route("/settings", settingsRoute);
v1.route("/external-docs", externalDocsRoute);
v1.route("/attachments", attachmentsRoute);
v1.route("/proxy", proxyRoute);

// Auto-generated OpenAPI spec endpoint
v1.get("/openapi.json", async (c) => {
  const openApiSpec = getSpec();
  return c.json(openApiSpec);
});

// Add Swagger UI using Hono middleware
app.get("/swagger", swaggerUI({ url: "/v1/openapi.json" }));

// Health check endpoint (outside /v1 so it's easily accessible)
app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

app.route("/v1/", v1);

// Initialize session cleanup job (runs every hour by default)
initializeSessionCleanup();

export default app;
