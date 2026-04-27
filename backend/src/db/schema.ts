import {
  integer,
  pgTable,
  varchar,
  serial,
  date,
  timestamp,
  text,
  jsonb,
  boolean,
  unique,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial().primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  username: varchar({ length: 255 }).notNull().unique(),
  email: varchar({ length: 255 }).notNull().unique(),
  password: varchar({ length: 255 }).notNull(),
  phone: varchar({ length: 20 }),
  status: varchar({ length: 20 }).default("active").notNull(), // active, inactive
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp()
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const sessions = pgTable("sessions", {
  id: serial().primaryKey(),
  userId: integer().references(() => users.id),
  createdAt: timestamp().defaultNow().notNull(),
  lastActivityAt: timestamp().defaultNow().notNull(),
  expiresAt: timestamp().notNull(),
  userAgent: varchar({ length: 255 }),
  ipAddress: varchar({ length: 45 }), // IPv6 support
  isActive: boolean().default(true).notNull(),
});

export const roles = pgTable("roles", {
  id: serial().primaryKey(),
  name: varchar({ length: 255 }).notNull().unique(),
  description: varchar({ length: 255 }),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp()
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const permissions = pgTable("permissions", {
  id: serial().primaryKey(),
  name: varchar({ length: 255 }).notNull().unique(), // e.g., "read:roles", "write:users"
  description: varchar({ length: 255 }).notNull(),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    id: serial().primaryKey(),
    roleId: integer().references(() => roles.id),
    permissionId: integer().references(() => permissions.id),
  },
  (table) => [
    unique().on(table.roleId, table.permissionId),
  ],
);

export const userRoles = pgTable("user_roles", {
  id: serial().primaryKey(),
  userId: integer().references(() => users.id, { onDelete: "cascade" }),
  roleId: integer().references(() => roles.id, { onDelete: "cascade" }),
});

// Simplified type definitions
export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Role = typeof roles.$inferSelect;
export type Permission = typeof permissions.$inferSelect;
export type UserRole = typeof userRoles.$inferSelect;
export type RolePermission = typeof rolePermissions.$inferSelect;

// Relations---------------------------------------------------------------
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  userRoles: many(userRoles),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  sessions: many(sessions),
  userRoles: many(userRoles),
  rolePermissions: many(rolePermissions),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
}));

// Documentation Builder Schema
export const documentations = pgTable("documentations", {
  id: serial().primaryKey(),
  title: varchar({ length: 255 }).notNull(),
  description: text(),
  version: varchar({ length: 50 }).default("1.0.0"),
  isPublic: boolean().default(false).notNull(),
  type: varchar({ length: 20 }).default("mixed").notNull(), // 'traditional', 'api', 'mixed'
  baseUrl: varchar({ length: 500 }), // For API documentation
  showApiEndpointsInSidebar: boolean().default(true), // Control whether to show API endpoints in sidebar
  ingestionToken: varchar({ length: 255 }), // Token required for ingesting external API documentation
  ingestionEnabled: boolean().default(false).notNull(), // Control whether external ingestion is allowed
  createdBy: integer()
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp()
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const sidebarItems: any = pgTable(
  "sidebar_items",
  {
    id: serial().primaryKey(),
    documentationId: integer()
      .references(() => documentations.id, { onDelete: "cascade" })
      .notNull(),
    title: varchar({ length: 255 }).notNull(),
    type: varchar({ length: 50 }).notNull(), // 'folder', 'page', 'divider'
    parentId: integer().references(() => sidebarItems.id, { onDelete: "cascade" }),
    order: integer().notNull().default(0),
    icon: varchar({ length: 100 }),
    isExpanded: boolean().default(true),
    deletedAt: timestamp(), // Soft delete: NULL = active, timestamp = deleted
    deletedBy: integer().references(() => users.id), // Who deleted this item
    createdAt: timestamp().defaultNow().notNull(),
    // Performance optimization fields
    materializedPath: text().default(""), // Store full path for fast queries
    level: integer().default(0), // Store depth level for queries
    isActive: boolean().default(true), // Active flag for filtering
  },
  (table) => [
    // Prevent item from referencing itself as parent
    check(
      "parent_not_self",
      sql`${table.parentId} IS NULL OR ${table.parentId} != ${table.id}`,
    ),
    // Ensure materialized path is not null for root items
    check(
      "materialized_path_not_null",
      sql`${table.parentId} IS NULL OR ${table.materializedPath} IS NOT NULL`,
    ),
  ],
);

export const pages = pgTable("pages", {
  id: serial().primaryKey(),
  sidebarItemId: integer()
    .references(() => sidebarItems.id, { onDelete: "cascade" })
    .notNull(),
  slug: varchar({ length: 255 }).notNull(),
  content: jsonb(),
  metadata: jsonb(), // For storing page-specific metadata
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp()
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// CRUD operations table removed - now using embedded operation references in markdown content

// OpenAPI Specifications table
export const openApiSpecs = pgTable("openapi_specs", {
  id: serial().primaryKey(),
  documentationId: integer()
    .references(() => documentations.id, { onDelete: "cascade" })
    .notNull(),
  specVersion: varchar({ length: 10 }).default("3.1.0").notNull(), // OpenAPI version
  info: jsonb().notNull(), // Title, description, version, contact, etc.
  servers: jsonb(), // Server definitions
  paths: jsonb(), // API paths and operations
  components: jsonb(), // Schemas, responses, parameters, etc.
  security: jsonb(), // Security schemes
  tags: jsonb(), // Tag definitions
  externalDocs: jsonb(), // External documentation
  rawSpec: jsonb(), // Full OpenAPI specification
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp()
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Type definitions for new tables
export type Documentation = typeof documentations.$inferSelect;
export type SidebarItem = typeof sidebarItems.$inferSelect;
export type Page = typeof pages.$inferSelect;
export type OpenApiSpec = typeof openApiSpecs.$inferSelect;

// Relations for documentation tables
export const documentationsRelations = relations(documentations, ({ one, many }) => ({
  creator: one(users, {
    fields: [documentations.createdBy],
    references: [users.id],
  }),
  sidebarItems: many(sidebarItems),
  openApiSpecs: many(openApiSpecs),
  attachments: many(uploads),
}));

// Type definitions for new schema fields
export type EnhancedSidebarItem = typeof sidebarItems.$inferSelect;

export const sidebarItemsRelations = relations(sidebarItems, ({ one, many }) => ({
  documentation: one(documentations, {
    fields: [sidebarItems.documentationId],
    references: [documentations.id],
  }),
  parent: one(sidebarItems, {
    fields: [sidebarItems.parentId],
    references: [sidebarItems.id],
    relationName: "parent_child",
  }),
  children: many(sidebarItems, {
    relationName: "parent_child",
  }),
  page: one(pages),
  // Self-referencing relations for hierarchy
  parentItem: one(sidebarItems, {
    fields: [sidebarItems.parentId],
    references: [sidebarItems.id],
    relationName: "parent_child",
  }),
  childItems: many(sidebarItems, {
    relationName: "parent_child",
  }),
}));

export const pagesRelations = relations(pages, ({ one, many }) => ({
  sidebarItem: one(sidebarItems, {
    fields: [pages.sidebarItemId],
    references: [sidebarItems.id],
  }),
  attachments: many(uploads),
}));

export const openApiSpecsRelations = relations(openApiSpecs, ({ one }) => ({
  documentation: one(documentations, {
    fields: [openApiSpecs.documentationId],
    references: [documentations.id],
  }),
}));

// System Settings table for storing configuration
export const systemSettings = pgTable("system_settings", {
  id: serial().primaryKey(),
  key: varchar({ length: 255 }).notNull().unique(),
  value: jsonb().notNull(),
  category: varchar({ length: 50 }).notNull(),
  description: text(),
  isPublic: boolean().default(false).notNull(),
  updatedAt: timestamp()
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// File uploads table for logos, favicons, and other assets
export const uploads = pgTable("uploads", {
  id: serial().primaryKey(),
  type: varchar({ length: 50 }).notNull(), // "logo", "favicon", "custom_asset"
  filename: varchar({ length: 255 }).notNull(),
  originalName: varchar({ length: 255 }).notNull(),
  mimeType: varchar({ length: 100 }).notNull(),
  size: integer().notNull(),
  path: varchar({ length: 500 }).notNull(), // File path in storage
  uploadedAt: timestamp().defaultNow().notNull(),
  // Security enhancement fields
  checksum: varchar({ length: 64 }).notNull().default(""), // SHA-256 hash
  fileSignature: varchar({ length: 32 }).notNull().default(""), // Magic bytes signature
  isQuarantined: boolean().default(false).notNull(), // Quarantine flag
  lastAccessedAt: timestamp().defaultNow().notNull(), // Access tracking
  storagePath: varchar({ length: 500 }).default(""), // Secure storage path
  uploadedBy: integer().references(() => users.id), // User who uploaded
  documentationId: integer().references(() => documentations.id, { onDelete: "cascade" }),
  pageId: integer().references(() => pages.id, { onDelete: "cascade" }),
  description: text(),
  createdAt: timestamp().defaultNow().notNull(),
});

// Relations for uploads
export const uploadsRelations = relations(uploads, ({ one }) => ({
  user: one(users, {
    fields: [uploads.uploadedBy],
    references: [users.id],
  }),
  documentation: one(documentations, {
    fields: [uploads.documentationId],
    references: [documentations.id],
  }),
  page: one(pages, {
    fields: [uploads.pageId],
    references: [pages.id],
  }),
}));
