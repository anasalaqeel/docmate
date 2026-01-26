// Settings system types

export type SettingCategory = "branding" | "theme" | "security" | "general" | "advanced";
export type SettingValue = string | number | boolean;
export type UploadType = "logo" | "favicon" | "custom_asset";
export type DocumentationType = "markdown" | "html" | "text";
export type UserRole = "user" | "moderator" | "admin";

export interface Setting {
  key: string;
  value: unknown;
  category: SettingCategory;
  description?: string;
  isPublic: boolean;
  updatedAt: string;
}

export interface ApiResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string>;
}

export interface SettingsListResult {
  settings: Setting[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SettingsQueryOptions {
  page?: number;
  limit?: number;
  search?: string;
  category?: SettingCategory;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface FileUploadData {
  path: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  checksum: string;
  fileId: string;
}
