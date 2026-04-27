import { registerRoute } from "./openApiGenerator";
import { registerSchema, loginSchema } from "../schemas/auth";

// Register all your routes here with their schemas
export function registerAllRoutes(): void {
  // System routes
  registerRoute("GET", "/", undefined, {
    tags: ["System"],
    summary: "API Health Check",
    description: "Check if the API is running successfully",
  });

  // Auth routes
  registerRoute("POST", "/auth/register", registerSchema, {
    tags: ["Authentication"],
    summary: "Register a new user",
    description: "Create a new user account with email and password",
  });

  registerRoute("POST", "/auth/login", loginSchema, {
    tags: ["Authentication"], 
    summary: "Login user",
    description: "Authenticate user with email and password",
  });

  registerRoute("GET", "/auth/me", undefined, {
    tags: ["Authentication"],
    summary: "Get current user",
    description: "Get the currently authenticated user's information",
  });

  registerRoute("POST", "/auth/logout", undefined, {
    tags: ["Authentication"],
    summary: "Logout user",
    description: "Logout the current user and invalidate session",
  });

  // Users management routes
  registerRoute("GET", "/users", undefined, {
    tags: ["Users Management"],
    summary: "Get all users",
    description: "Retrieve a paginated list of users with search and filtering options",
    parameters: [
      {
        name: "page",
        in: "query",
        description: "Page number for pagination",
        required: false,
        schema: { type: "integer", default: 1 }
      },
      {
        name: "limit",
        in: "query",
        description: "Number of users per page",
        required: false,
        schema: { type: "integer", default: 10 }
      },
      {
        name: "search",
        in: "query",
        description: "Search term to filter users by name, email, or phone",
        required: false,
        schema: { type: "string" }
      }
    ]
  });

  registerRoute("GET", "/users/:id", undefined, {
    tags: ["Users Management"],
    summary: "Get user by ID",
    description: "Retrieve detailed information about a specific user",
    parameters: [
      {
        name: "id",
        in: "path",
        description: "User ID",
        required: true,
        schema: { type: "integer" }
      }
    ]
  });

  registerRoute("POST", "/users", undefined, {
    tags: ["Users Management"],
    summary: "Create new user",
    description: "Create a new user account with specified roles"
  });

  registerRoute("PUT", "/users/:id", undefined, {
    tags: ["Users Management"],
    summary: "Update user",
    description: "Update user information and roles",
    parameters: [
      {
        name: "id",
        in: "path",
        description: "User ID",
        required: true,
        schema: { type: "integer" }
      }
    ]
  });

  registerRoute("DELETE", "/users/:id", undefined, {
    tags: ["Users Management"],
    summary: "Delete user",
    description: "Permanently delete a user account",
    parameters: [
      {
        name: "id",
        in: "path",
        description: "User ID",
        required: true,
        schema: { type: "integer" }
      }
    ]
  });

  // Roles management routes
  registerRoute("GET", "/users/roles", undefined, {
    tags: ["Roles Management"],
    summary: "Get all roles",
    description: "Retrieve a paginated list of roles with their permissions"
  });

  registerRoute("GET", "/users/roles/all", undefined, {
    tags: ["Roles Management"],
    summary: "Get all roles (simple list)",
    description: "Retrieve a simple list of all roles for dropdowns and selects"
  });

  registerRoute("POST", "/users/roles", undefined, {
    tags: ["Roles Management"],
    summary: "Create new role",
    description: "Create a new role with specified permissions"
  });

  registerRoute("PUT", "/users/roles/:id", undefined, {
    tags: ["Roles Management"],
    summary: "Update role",
    description: "Update role name and permissions",
    parameters: [
      {
        name: "id",
        in: "path",
        description: "Role ID",
        required: true,
        schema: { type: "integer" }
      }
    ]
  });

  registerRoute("DELETE", "/users/roles/:id", undefined, {
    tags: ["Roles Management"],
    summary: "Delete role",
    description: "Delete a role (only if not assigned to any users)",
    parameters: [
      {
        name: "id",
        in: "path",
        description: "Role ID",
        required: true,
        schema: { type: "integer" }
      }
    ]
  });

  // Permissions routes
  registerRoute("GET", "/users/permissions", undefined, {
    tags: ["Roles Management"],
    summary: "Get all permissions",
    description: "Retrieve a paginated list of all available permissions"
  });

  registerRoute("GET", "/users/permissions/all", undefined, {
    tags: ["Roles Management"],
    summary: "Get all permissions (simple list)",
    description: "Retrieve a simple list of all permissions for role management"
  });

  // Settings management routes
  registerRoute("GET", "/settings", undefined, {
    tags: ["Settings Management"],
    summary: "Get all settings",
    description: "Retrieve a paginated list of system settings with search and filtering",
    parameters: [
      {
        name: "page",
        in: "query",
        description: "Page number for pagination",
        required: false,
        schema: { type: "integer", default: 1 }
      },
      {
        name: "limit",
        in: "query",
        description: "Number of settings per page",
        required: false,
        schema: { type: "integer", default: 50 }
      },
      {
        name: "category",
        in: "query",
        description: "Filter settings by category (branding, theme, security, general, advanced)",
        required: false,
        schema: { type: "string" }
      }
    ]
  });

  registerRoute("GET", "/settings/all", undefined, {
    tags: ["Settings Management"],
    summary: "Get all settings (simple list)",
    description: "Retrieve all settings without pagination for dropdowns and selects"
  });

  registerRoute("GET", "/settings/:key", undefined, {
    tags: ["Settings Management"],
    summary: "Get setting by key",
    description: "Retrieve a specific system setting by its key",
    parameters: [
      {
        name: "key",
        in: "path",
        description: "Setting key",
        required: true,
        schema: { type: "string" }
      }
    ]
  });

  registerRoute("PUT", "/settings/:key", undefined, {
    tags: ["Settings Management"],
    summary: "Update setting",
    description: "Update a specific system setting value",
    parameters: [
      {
        name: "key",
        in: "path",
        description: "Setting key",
        required: true,
        schema: { type: "string" }
      }
    ]
  });

  registerRoute("PUT", "/settings/bulk", undefined, {
    tags: ["Settings Management"],
    summary: "Bulk update settings",
    description: "Update multiple system settings in a single request"
  });

  registerRoute("POST", "/settings/upload", undefined, {
    tags: ["Settings Management"],
    summary: "Upload file",
    description: "Upload a file for settings (logo, favicon, or custom asset)",
    parameters: [
      {
        name: "file",
        in: "formData",
        description: "File to upload",
        required: true,
        schema: { type: "string", format: "binary" }
      },
      {
        name: "type",
        in: "formData",
        description: "Upload type (logo, favicon, custom_asset)",
        required: true,
        schema: { type: "string", enum: ["logo", "favicon", "custom_asset"] }
      }
    ]
  });

  // Attachments routes
  registerRoute("GET", "/attachments/docs/:docId", undefined, {
    tags: ["Attachments"],
    summary: "Get project attachments",
    description: "Retrieve all project-level attachments for a documentation"
  });

  registerRoute("GET", "/attachments/pages/:pageId", undefined, {
    tags: ["Attachments"],
    summary: "Get page attachments",
    description: "Retrieve all page-level attachments for a specific page"
  });

  registerRoute("POST", "/attachments/docs/:docId", undefined, {
    tags: ["Attachments"],
    summary: "Upload project attachment",
    description: "Upload and link a file to a documentation project globally"
  });

  registerRoute("POST", "/attachments/pages/:pageId", undefined, {
    tags: ["Attachments"],
    summary: "Upload page attachment",
    description: "Upload and link a file to a specific documentation page"
  });

  registerRoute("DELETE", "/attachments/:id", undefined, {
    tags: ["Attachments"],
    summary: "Delete attachment",
    description: "Permanently delete an attachment and its physical file"
  });
}

// Call this function to register all routes
registerAllRoutes();
