import { get, post, put, patch, del, getInstance } from './httpService';
import type { JsonSchema, ApiExample, DocumentMetadata, PageContent, OpenApiSpec, CrudOperation, Documentation, SidebarItem } from '../types/docs';
import type { ApiResponse } from '../types/api';

export type { Documentation, SidebarItem } from '../types/docs';

export interface Page {
  id: number;
  sidebarItemId: number;
  slug: string;
  content: PageContent;
  crudOperations: CrudOperation[];
  metadata?: DocumentMetadata;
  createdAt: string;
  updatedAt: string;
}

// CrudOperation interface removed - now using embedded operation references

export interface CreateDocumentationRequest {
  title: string;
  description?: string;
  version?: string;
  isPublic?: boolean;
  type?: 'traditional' | 'api' | 'mixed';
  baseUrl?: string;
}

export type UpdateDocumentationRequest = CreateDocumentationRequest;

export interface CreateSidebarItemRequest {
  title: string;
  type: 'folder' | 'page' | 'divider';
  parentId?: number;
  icon?: string;
  order?: number;
}

export interface UpdateSidebarItemRequest {
  title?: string;
  type?: 'folder' | 'page' | 'divider';
  parentId?: number;
  icon?: string;
  order?: number;
  isExpanded?: boolean;
}

export interface CreatePageRequest {
  slug: string;
  content?: PageContent;
  metadata?: DocumentMetadata;
}

export interface UpdatePageRequest {
  slug?: string;
  content?: PageContent;
  metadata?: DocumentMetadata;
}

export interface CreateCrudOperationRequest {
  method: string;
  endpoint: string;
  title: string;
  description?: string;
  requestSchema?: JsonSchema;
  responseSchema?: JsonSchema;
  examples?: ApiExample[];
  order?: number;
}

export type UpdateCrudOperationRequest = CreateCrudOperationRequest;

// Documentation CRUD functions
export const getAllDocs = async (): Promise<ApiResponse<Documentation[]>> => {
  return get<ApiResponse<Documentation[]>>('/docs');
};

export const getDocById = async (id: number): Promise<ApiResponse<Documentation>> => {
  return get<ApiResponse<Documentation>>(`/docs/${id}`);
};

export const createDoc = async (data: CreateDocumentationRequest): Promise<ApiResponse<Documentation>> => {
  return post<ApiResponse<Documentation>>('/docs', data);
};

export const updateDoc = async (id: number, data: UpdateDocumentationRequest): Promise<ApiResponse<Documentation>> => {
  return patch<ApiResponse<Documentation>>(`/docs/${id}`, data);
};

export const deleteDoc = async (id: number): Promise<ApiResponse<null>> => {
  return del<ApiResponse<null>>(`/docs/${id}`);
};

// Sidebar Items CRUD functions
export const createSidebarItem = async (docId: number, data: CreateSidebarItemRequest): Promise<ApiResponse<SidebarItem>> => {
  return post<ApiResponse<SidebarItem>>(`/docs/${docId}/sidebar-items`, data);
};

export const updateSidebarItem = async (docId: number, itemId: number, data: UpdateSidebarItemRequest): Promise<ApiResponse<SidebarItem>> => {
  return put<ApiResponse<SidebarItem>>(`/docs/${docId}/sidebar-items/${itemId}`, data);
};

export const deleteSidebarItem = async (docId: number, itemId: number): Promise<ApiResponse<null>> => {
  return del<ApiResponse<null>>(`/docs/${docId}/sidebar-items/${itemId}`);
};

// Trash management functions
export interface TrashItem extends SidebarItem {
  descendantCount?: number;
  deletedAt?: string;
  deletedBy?: number;
}

export const getTrash = async (docId: number): Promise<ApiResponse<TrashItem[]>> => {
  return get<ApiResponse<TrashItem[]>>(`/docs/${docId}/trash`);
};

export const restoreFromTrash = async (docId: number, itemId: number): Promise<ApiResponse<{ restoredCount: number }>> => {
  return post<ApiResponse<{ restoredCount: number }>>(`/docs/${docId}/sidebar-items/${itemId}/restore`, {});
};

export const permanentDelete = async (docId: number, itemId: number): Promise<ApiResponse<null>> => {
  return del<ApiResponse<null>>(`/docs/${docId}/sidebar-items/${itemId}/permanent`);
};

export interface ReorderItem {
  id: number;
  parentId?: number | null;
  order: number;
}

export const reorderSidebarItems = async (docId: number, items: ReorderItem[]): Promise<ApiResponse<SidebarItem[]>> => {
  return post<ApiResponse<SidebarItem[]>>(`/docs/${docId}/sidebar-items/reorder`, { items });
};

// Pages CRUD functions
export const createPage = async (docId: number, itemId: number, data: CreatePageRequest): Promise<ApiResponse<Page>> => {
  return post<ApiResponse<Page>>(`/docs/${docId}/sidebar-items/${itemId}/page`, data);
};

export const updatePage = async (pageId: number, data: UpdatePageRequest): Promise<ApiResponse<Page>> => {
  return put<ApiResponse<Page>>(`/docs/pages/${pageId}`, data);
};

// CRUD Operations CRUD functions
export const createCrudOperation = async (pageId: number, data: CreateCrudOperationRequest): Promise<ApiResponse<CrudOperation>> => {
  return post<ApiResponse<CrudOperation>>(`/docs/pages/${pageId}/crud-operations`, data);
};

export const updateCrudOperation = async (operationId: number, data: UpdateCrudOperationRequest): Promise<ApiResponse<CrudOperation>> => {
  return put<ApiResponse<CrudOperation>>(`/docs/crud-operations/${operationId}`, data);
};

export const deleteCrudOperation = async (operationId: number): Promise<ApiResponse<null>> => {
  return del<ApiResponse<null>>(`/docs/crud-operations/${operationId}`);
};

// Public documentation functions (no auth required)
export const getPublicDocs = async (): Promise<ApiResponse<Documentation[]>> => {
  return get<ApiResponse<Documentation[]>>('/docs/public');
};

export const getPublicDocById = async (id: number): Promise<ApiResponse<Documentation>> => {
  return get<ApiResponse<Documentation>>(`/docs/public/${id}`);
};

export const getPublicOpenApiSpec = async (docId: number): Promise<ApiResponse<OpenApiSpec>> => {
  return get<ApiResponse<OpenApiSpec>>(`/docs/public/${docId}/openapi`);
};

// OpenAPI operations
export const getOpenApiSpec = async (docId: number): Promise<ApiResponse<OpenApiSpec>> => {
  return get<ApiResponse<OpenApiSpec>>(`/docs/${docId}/openapi`);
};

export const importOpenApiSpec = async (docId: number, spec: Record<string, unknown>): Promise<ApiResponse<null>> => {
  return post<ApiResponse<null>>(`/docs/${docId}/openapi/import`, spec);
};

export const exportOpenApiSpec = async (docId: number): Promise<Blob> => {
  const response = await getInstance().get(`/docs/${docId}/openapi/export`, {
    responseType: 'blob'
  });
  return response.data;
};

export const deleteOpenApiSpec = async (docId: number): Promise<ApiResponse<null>> => {
  return del<ApiResponse<null>>(`/docs/${docId}/openapi`);
};

// Default export for backwards compatibility
const docsService = {
  getAllDocs,
  getDocById,
  createDoc,
  updateDoc,
  deleteDoc,
  createSidebarItem,
  updateSidebarItem,
  deleteSidebarItem,
  getTrash,
  restoreFromTrash,
  permanentDelete,
  reorderSidebarItems,
  createPage,
  updatePage,
  createCrudOperation,
  updateCrudOperation,
  deleteCrudOperation,
  getPublicDocs,
  getPublicDocById,
  getPublicOpenApiSpec,
  getOpenApiSpec,
  importOpenApiSpec,
  exportOpenApiSpec,
  deleteOpenApiSpec,
};

export default docsService;