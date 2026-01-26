// Core user and authentication types
export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
  userRoles: UserRole[];
}

export interface UserRole {
  id: number;
  userId: number;
  roleId: number;
  role: Role;
}

export interface Role {
  id: number;
  name: string;
  rolePermissions?: RolePermission[];
  createdAt?: string;
  updatedAt?: string;
}

export interface RolePermission {
  id: number;
  roleId: number;
  permissionId: number;
  permission: Permission;
}

export interface Permission {
  id: number;
  name: string;
  description: string;
}

// API request/response types
export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  status?: 'active' | 'inactive';
  roleIds?: number[];
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  status?: 'active' | 'inactive';
  roleIds?: number[];
}

export interface UserListOptions {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'name' | 'email' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  roleIds?: number[];
  status?: 'active' | 'inactive';
}

export interface CreateRoleData {
  name: string;
  permissionIds?: number[];
}

export interface UpdateRoleData {
  name?: string;
  permissionIds?: number[];
}

export interface RoleListOptions {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'name' | 'id' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface PermissionListOptions {
  page?: number;
  limit?: number;
  search?: string;
}

export interface AssignRolesData {
  roleIds: number[];
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Admin resetting user's password (doesn't require current password)
export interface AdminResetPasswordData {
  newPassword: string;
  confirmPassword: string;
}

// Additional UI-specific types
export interface UserFormData {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  roleIds: number[];
}

export interface RoleFormData {
  name: string;
  permissionIds: number[];
}

export interface UsersTableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
}

export interface UserTableActions {
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onView: (user: User) => void;
  onManageRoles: (user: User) => void;
}

export interface RoleTableActions {
  onEdit: (role: Role) => void;
  onDelete: (role: Role) => void;
  onView: (role: Role) => void;
  onManagePermissions: (role: Role) => void;
}

export interface UsersFilterState {
  search: string;
  roleIds: number[];
  sortBy: 'name' | 'email' | 'createdAt' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}

export interface RolesFilterState {
  search: string;
  sortBy: 'name' | 'id' | 'createdAt';
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}

export interface PermissionsFilterState {
  search: string;
  page: number;
  limit: number;
}

export interface UserManagementState {
  users: User[];
  roles: Role[];
  permissions: Permission[];
  loading: boolean;
  error: string | null;
  filters: UsersFilterState;
  total: number;
  totalPages: number;
}

export interface RoleManagementState {
  roles: Role[];
  permissions: Permission[];
  loading: boolean;
  error: string | null;
  filters: RolesFilterState;
  total: number;
  totalPages: number;
}

export interface UserManagementActions {
  loadUsers: (filters?: Partial<UsersFilterState>) => Promise<void>;
  createUser: (userData: UserFormData) => Promise<void>;
  updateUser: (id: number, userData: Partial<UserFormData>) => Promise<void>;
  deleteUser: (id: number) => Promise<void>;
  assignRoles: (userId: number, roleIds: number[]) => Promise<void>;
  removeRole: (userId: number, roleId: number) => Promise<void>;
  changePassword: (userId: number, passwordData: ChangePasswordData) => Promise<void>;
  setFilters: (filters: Partial<UsersFilterState>) => void;
  clearError: () => void;
}

export interface RoleManagementActions {
  loadRoles: (filters?: Partial<RolesFilterState>) => Promise<void>;
  loadPermissions: () => Promise<void>;
  createRole: (roleData: RoleFormData) => Promise<void>;
  updateRole: (id: number, roleData: Partial<RoleFormData>) => Promise<void>;
  deleteRole: (id: number) => Promise<void>;
  assignPermissions: (roleId: number, permissionIds: number[]) => Promise<void>;
  setFilters: (filters: Partial<RolesFilterState>) => void;
  clearError: () => void;
}

// Form validation types
export interface FormValidationError {
  field: string;
  message: string;
}

export interface FormValidationState {
  errors: FormValidationError[];
  isValid: boolean;
}

export interface UserFormValidation {
  name: string | null;
  email: string | null;
  password: string | null;
  confirmPassword: string | null;
  phone: string | null;
  roleIds: string | null;
}

export interface RoleFormValidation {
  name: string | null;
  permissionIds: string | null;
}

// Modal and UI state types
export type ModalType = 'create-user' | 'edit-user' | 'delete-user' | 'manage-roles' |
                      'create-role' | 'edit-role' | 'delete-role' | 'manage-permissions' |
                      'change-password' | 'view-user' | 'view-role' | null;

export interface ModalState {
  type: ModalType;
  data: User | Role | null;
  isOpen: boolean;
}

export interface NotificationState {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  visible: boolean;
  duration?: number;
}

// Permission constants
export const PERMISSIONS = {
  // User management
  USERS_CREATE: 'users:create',
  USERS_READ: 'users:read',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',

  // Role management
  ROLES_CREATE: 'roles:create',
  ROLES_READ: 'roles:read',
  ROLES_UPDATE: 'roles:update',
  ROLES_DELETE: 'roles:delete',

  // Profile management
  PROFILE_MANAGE: 'profile:manage',

  // Content management
  CONTENT_CREATE: 'content:create',
  CONTENT_READ: 'content:read',
  CONTENT_UPDATE: 'content:update',
  CONTENT_DELETE: 'content:delete',

  // Documentation management
  DOCS_CREATE: 'docs:create',
  DOCS_READ: 'docs:read',
  DOCS_UPDATE: 'docs:update',
  DOCS_DELETE: 'docs:delete',

  // System permissions
  SYSTEM_ALL: 'system:all'
} as const;

export type PermissionName = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Role constants
export const DEFAULT_ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  USER: 'user'
} as const;

export type DefaultRoleName = typeof DEFAULT_ROLES[keyof typeof DEFAULT_ROLES];

// Helper type for permission checking
export type PermissionCheck = (permission: PermissionName) => boolean;

// Table configuration types
export interface TableConfig {
  columns: UsersTableColumn[];
  pageSize: number;
  showPagination: boolean;
  showSearch: boolean;
  showFilters: boolean;
  sortable: boolean;
}

export const DEFAULT_USERS_TABLE_CONFIG: TableConfig = {
  columns: [
    { key: 'name', label: 'Name', sortable: true, width: '200px' },
    { key: 'email', label: 'Email', sortable: true, width: '250px' },
    { key: 'phone', label: 'Phone', sortable: false, width: '150px' },
    { key: 'roles', label: 'Roles', sortable: false, width: '200px' },
    { key: 'createdAt', label: 'Created', sortable: true, width: '120px' },
    { key: 'actions', label: 'Actions', sortable: false, width: '150px' }
  ],
  pageSize: 10,
  showPagination: true,
  showSearch: true,
  showFilters: true,
  sortable: true
};

export const DEFAULT_ROLES_TABLE_CONFIG: TableConfig = {
  columns: [
    { key: 'name', label: 'Role Name', sortable: true, width: '200px' },
    { key: 'permissions', label: 'Permissions', sortable: false, width: '300px' },
    { key: 'userCount', label: 'Users', sortable: false, width: '100px' },
    { key: 'actions', label: 'Actions', sortable: false, width: '150px' }
  ],
  pageSize: 10,
  showPagination: true,
  showSearch: true,
  showFilters: false,
  sortable: true
};