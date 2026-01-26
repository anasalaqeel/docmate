// JSON Schema type for API documentation
export interface JsonSchema {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  description?: string;
  example?: unknown;
  enum?: unknown[];
  format?: string;
  [key: string]: unknown;
}

// API operation examples
export interface ApiExample {
  name: string;
  description?: string;
  request?: unknown;
  response?: unknown;
}

// CRUD operation definition
export interface CrudOperation {
  id?: number;
  pageId?: number;
  method: string;
  endpoint: string;
  title: string;
  description?: string;
  operationId?: string;
  summary?: string;
  tags?: string[];
  parameters?: Array<{
    name: string;
    in: 'path' | 'query' | 'header' | 'cookie';
    description?: string;
    required?: boolean;
    schema?: JsonSchema;
    type?: string;
    example?: unknown;
  }>;
  requestSchema?: JsonSchema;
  responses?: Record<string, {
    description?: string;
    schema?: JsonSchema;
    examples?: unknown;
  }>;
  security?: Array<{
    type?: string;
    name?: string;
    in?: string;
    scheme?: string;
    bearerFormat?: string;
  }>;
  deprecated?: boolean;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Page content structure
export interface PageContent {
  title?: string;
  description?: string;
  sections?: PageSection[];
  [key: string]: unknown;
}

export interface PageSection {
  id?: string;
  title: string;
  content: string;
  type?: 'text' | 'code' | 'api' | 'table';
  [key: string]: unknown;
}

// Document metadata
export interface DocumentMetadata {
  version?: string;
  lastModified?: string;
  author?: string;
  tags?: string[];
  [key: string]: unknown;
}

// OpenAPI Specification
export interface OpenApiInfo {
  title: string;
  description?: string;
  version: string;
  termsOfService?: string;
  contact?: {
    name?: string;
    url?: string;
    email?: string;
  };
  license?: {
    name: string;
    url?: string;
  };
}

export interface OpenApiServer {
  url: string;
  description?: string;
  variables?: Record<string, {
    enum?: string[];
    default: string;
    description?: string;
  }>;
}

export interface OpenApiOperation {
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: Array<{
    name: string;
    in: 'path' | 'query' | 'header' | 'cookie';
    description?: string;
    required?: boolean;
    schema?: JsonSchema;
    type?: string;
  }>;
  requestBody?: {
    description?: string;
    required?: boolean;
    content?: Record<string, {
      schema?: JsonSchema;
      example?: unknown;
    }>;
  };
  responses?: Record<string, {
    description?: string;
    content?: Record<string, {
      schema?: JsonSchema;
      example?: unknown;
    }>;
  }>;
  tags?: string[];
  [key: string]: unknown;
}

export interface OpenApiPath {
  [method: string]: OpenApiOperation;
}

export interface OpenApiSpec {
  id?: string;
  documentationId: number;
  specVersion: string;
  info: OpenApiInfo;
  servers?: OpenApiServer[];
  paths?: Record<string, OpenApiPath>;
  components?: Record<string, Record<string, unknown>>;
  security?: Array<Record<string, string[]>>;
  tags?: Array<{ name: string; description?: string }>;
  externalDocs?: { url: string; description?: string };
  rawSpec?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

// Documentation types
export type DocumentationType = 'traditional' | 'api' | 'mixed';

// API Documentation page
export interface DocumentationPage {
  id?: string;
  title: string;
  slug: string;
  content: PageContent;
  metadata?: DocumentMetadata;
  isPublished?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Sidebar item for documentation navigation
export interface SidebarItem {
  id: number;
  documentationId: number;
  title: string;
  type: 'folder' | 'page' | 'divider';
  parentId?: number;
  order: number;
  icon?: string;
  isExpanded: boolean;
  createdAt: string;
  page?: {
    id: number;
    sidebarItemId?: number;
    slug: string;
    content: PageContent;
    crudOperations: CrudOperation[];
    metadata?: DocumentMetadata;
    createdAt?: string;
    updatedAt?: string;
  };
  children?: SidebarItem[];
}

// Documentation project
export interface Documentation {
  id?: number;
  title: string;
  description?: string;
  version?: string;
  isPublic?: boolean;
  type?: DocumentationType;
  baseUrl?: string;
  showApiEndpointsInSidebar?: boolean; // Control whether to show API endpoints in sidebar
  ingestionToken?: string | null; // Token required for ingesting external API documentation
  ingestionEnabled?: boolean; // Control whether external ingestion is allowed
  createdBy?: number;
  createdAt?: string;
  updatedAt?: string;
  creator?: {
    id: number;
    name: string;
    email?: string;
  };
  sidebarItems?: SidebarItem[];
  openApiSpecs?: OpenApiSpec[];
}