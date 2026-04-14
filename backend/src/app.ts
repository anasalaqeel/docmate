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
import { getSpec } from "./utils/openApiGenerator";
import { initializeSessionCleanup } from "./utils/sessionCleanup";
import config from "config";
// Explicitly register OpenAPI documentation
import "./utils/registerRoutes";
// Import settings definitions to register them
import "./config/settings.definitions";

const app = new Hono();

// Dynamic CORS configuration based on environment
const rawCorsOrigins = config.get<string[] | string>("corsOrigins");
const corsOrigins = typeof rawCorsOrigins === "string"
  ? rawCorsOrigins.split(",").map((o: string) => o.trim()).filter(Boolean)
  : Array.isArray(rawCorsOrigins)
    ? rawCorsOrigins
    : [];
app.use(
  cors({
    origin:
      corsOrigins.length > 0
        ? corsOrigins
        : ["http://localhost:5173", "http://localhost:5177", "http://localhost:5174"],
    credentials: true, // Important for cookies
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

app.use("*", errorLogger);
app.use("*", productionErrorHandler);

const v1 = new Hono();

v1.route("/", mainRoute);
v1.route("/auth", authRoute);
v1.route("/docs", docsRoute);
v1.route("/users", usersRoute);
v1.route("/roles", rolesRoute);
v1.route("/permissions", permissionsRoute);
v1.route("/settings", settingsRoute);
v1.route("/external-docs", externalDocsRoute);

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
