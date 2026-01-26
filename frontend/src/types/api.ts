/**
 * API Response Types
 * Standard response wrappers for API endpoints
 */

import type { User, Role, Permission } from './users';

// Standard API response wrapper for most endpoints
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

// Response types for list endpoints
export interface UserListResult {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RolesListResponse {
  success: boolean;
  roles: Role[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  message?: string;
}

export interface PermissionListResult {
  permissions: Permission[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
