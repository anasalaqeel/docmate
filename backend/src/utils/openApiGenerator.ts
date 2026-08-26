import { Hono } from "hono";
import { ZodType, ZodObject, ZodString, ZodNumber, ZodBoolean, ZodArray, ZodOptional } from "zod";

interface RouteInfo {
  method: string;
  path: string;
  schema?: ZodType<any>;
  tags?: string[];
  summary?: string;
  description?: string;
  parameters?: any[];
}

interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  components: {
    securitySchemes: Record<string, any>;
  };
  paths: Record<string, any>;
  tags: Array<{
    name: string;
    description: string;
  }>;
}

interface OpenAPIConfig {
  title: string;
  version: string;
  description: string;
  serverUrl: string;
  serverDescription: string;
}

// Store routes in module scope
let routes: RouteInfo[] = [];
let config: OpenAPIConfig = {
  title: "DOCMATE Backend API",
  version: "1.0.0",
  description: "API documentation for DOCMATE backend services",
  serverUrl: "/v1", // Default to relative path
  serverDescription: "API Server",
};

// Initialize configuration
export function initializeOpenAPI(openApiConfig: Partial<OpenAPIConfig>): void {
  config = { ...config, ...openApiConfig };
}

// Register a route with its schema
export function registerRoute(
  method: string,
  path: string,
  schema?: ZodType<any>,
  options?: {
    tags?: string[];
    summary?: string;
    description?: string;
    parameters?: any[];
  }
): void {
  routes.push({
    method: method.toLowerCase(),
    path,
    schema,
    tags: options?.tags,
    summary: options?.summary,
    description: options?.description,
  });
}

// Convert Zod schema to OpenAPI schema
function zodToOpenAPI(schema: ZodType<any>): any {
  if (!schema) {
    return { type: "object" };
  }

  // Use modern Zod type checking with instanceof
  if (schema instanceof ZodObject) {
    const properties: Record<string, any> = {};
    const required: string[] = [];
    const shape = schema.shape;

    Object.entries(shape).forEach(([key, value]: [string, any]) => {
      properties[key] = zodToOpenAPI(value);
      
      // Check if field is required (not optional)
      if (!(value instanceof ZodOptional)) {
        required.push(key);
      }
    });

    return {
      type: "object",
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  if (schema instanceof ZodString) {
    const result: any = { type: "string" };
    
    // For now, provide basic string schema without accessing deprecated _def
    // In a real implementation, you might use schema.safeParse() to infer constraints
    return result;
  }

  if (schema instanceof ZodNumber) {
    return { type: "number" };
  }

  if (schema instanceof ZodBoolean) {
    return { type: "boolean" };
  }

  if (schema instanceof ZodArray) {
    // Use element property instead of _def
    const element = (schema as any).element || (schema as any)._def?.type;
    return {
      type: "array",
      items: element ? zodToOpenAPI(element) : { type: "object" },
    };
  }

  if (schema instanceof ZodOptional) {
    // Use unwrap() method instead of _def
    const innerType = (schema as any).unwrap?.() || (schema as any)._def?.innerType;
    return innerType ? zodToOpenAPI(innerType) : { type: "object" };
  }

  // Default fallback
  return { type: "object" };
}

// Generate response schemas based on common patterns
function generateResponseSchemas(path: string, method: string) {
  const responses: Record<string, any> = {};

  // Common success response
  responses["200"] = {
    description: getSuccessDescription(path, method),
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string" },
            data: { type: "object" },
          },
        },
      },
    },
  };

  // Common error responses
  if (method === "post" || method === "put") {
    responses["400"] = {
      description: "Bad request",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string", example: "Validation error" },
            },
          },
        },
      },
    };
  }

  if (path.includes("/auth/") && path !== "/auth/register") {
    responses["401"] = {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string", example: "Unauthorized" },
            },
          },
        },
      },
    };
  }

  responses["500"] = {
    description: "Internal server error",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            message: { type: "string", example: "Internal server error" },
          },
        },
      },
    },
  };

  return responses;
}

function getSuccessDescription(path: string, method: string): string {
  if (path === "/" && method === "get") return "API is running successfully";
  if (path.includes("/register")) return "User registered successfully";
  if (path.includes("/login")) return "Login successful";
  if (path.includes("/logout")) return "Logged out successfully";
  if (path.includes("/me")) return "User information retrieved";
  return "Success";
}

function getSummary(path: string, method: string): string {
  if (path === "/" && method === "get") return "API Health Check";
  if (path.includes("/register")) return "Register a new user";
  if (path.includes("/login")) return "Login user";
  if (path.includes("/logout")) return "Logout user";  
  if (path.includes("/me")) return "Get current user";
  return `${method.toUpperCase()} ${path}`;
}

function getTags(path: string): string[] {
  if (path === "/") return ["System"];
  if (path.includes("/auth/")) return ["Authentication"];
  return ["API"];
}

function requiresAuth(path: string, method: string): boolean {
  const authPaths = ["/auth/me", "/auth/logout"];
  return authPaths.some(authPath => path.includes(authPath));
}

// Generate the complete OpenAPI specification
function generateSpec(): OpenAPISpec {
  const paths: Record<string, any> = {};

  routes.forEach(route => {
    const { method, path, schema, tags, summary, description, parameters } = route;

    if (!paths[path]) {
      paths[path] = {};
    }

    const operation: any = {
      summary: summary || getSummary(path, method),
      tags: tags || getTags(path),
      responses: generateResponseSchemas(path, method),
    };

    if (description) {
      operation.description = description;
    }

    if (parameters && parameters.length > 0) {
      operation.parameters = parameters;
    }

    // Add request body for POST/PUT methods with schema
    if ((method === "post" || method === "put") && schema) {
      operation.requestBody = {
        content: {
          "application/json": {
            schema: zodToOpenAPI(schema),
          },
        },
      };
    }

    // Add security for protected routes
    if (requiresAuth(path, method)) {
      operation.security = [{ cookieAuth: [] }];
    }

    paths[path][method] = operation;
  });

  const spec: OpenAPISpec = {
    openapi: "3.0.3",
    info: {
      title: config.title,
      version: config.version,
      description: config.description,
    },
    servers: [
      {
        url: config.serverUrl,
        description: config.serverDescription,
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "sessionToken",
          description: "Session token stored in HTTP-only cookie",
        },
      },
    },
    paths,
    tags: [
      { name: "Authentication", description: "Authentication endpoints" },
      { name: "System", description: "System endpoints" },
    ],
  };

  return spec;
}

// Get the generated spec as JSON
export function getSpec(): OpenAPISpec {
  return generateSpec();
}