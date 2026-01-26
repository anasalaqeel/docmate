import { get, post, put, del } from "./httpService";
import type { ErrorResponse } from "./httpService";
import type {
  User,
  Role,
  Permission,
  CreateUserData,
  UpdateUserData,
  UserListOptions,
  CreateRoleData,
  UpdateRoleData,
  RoleListOptions,
  PermissionListOptions,
  ChangePasswordData,
  AdminResetPasswordData
} from "../types/users";
import type {
  ApiResponse,
  UserListResult,
  RolesListResponse,
  PermissionListResult
} from "../types/api";

// Users API Service
export class UsersService {
  // User management
  async getUsers(options: UserListOptions = {}): Promise<ApiResponse<UserListResult>> {
    const params = new URLSearchParams();

    if (options.page) params.append('page', options.page.toString());
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.search) params.append('search', options.search);
    if (options.sortBy) params.append('sortBy', options.sortBy);
    if (options.sortOrder) params.append('sortOrder', options.sortOrder);
    if (options.status) params.append('status', options.status);
    if (options.roleIds && options.roleIds.length > 0) {
      params.append('roleIds', options.roleIds.join(','));
    }

    const url = `/users${params.toString() ? `?${params.toString()}` : ''}`;
    return get<ApiResponse<UserListResult>>(url);
  }

  async getUserById(id: number): Promise<User> {
    return get<User>(`/users/${id}`);
  }

  async createUser(userData: CreateUserData): Promise<User> {
    const response = await post<ApiResponse<User>>('/users', userData);
    return response.data!;
  }

  async updateUser(id: number, userData: UpdateUserData): Promise<User> {
    const response = await put<ApiResponse<User>>(`/users/${id}`, userData);
    return response.data!;
  }

  async deleteUser(id: number): Promise<void> {
    return del<void>(`/users/${id}`);
  }

  // Role management for users
  async assignRolesToUser(userId: number, roleIds: number[]): Promise<User> {
    const response = await post<ApiResponse<User>>(`/users/${userId}/roles`, { roleIds });
    return response.data!;
  }

  async removeRoleFromUser(userId: number, roleId: number): Promise<User> {
    try {
      return del<User>(`/users/${userId}/roles/${roleId}`);
    } catch (error) {
      throw new Error((error as ErrorResponse).response?.data?.message || 'Failed to remove role from user');
    }
  }

  async changeUserPassword(userId: number, passwordData: ChangePasswordData): Promise<void> {
    return post<void>(`/users/${userId}/change-password`, passwordData);
  }

  // Admin reset user password (doesn't require current password)
  async adminResetUserPassword(userId: number, passwordData: AdminResetPasswordData): Promise<void> {
    return post<void>(`/users/${userId}/change-password`, passwordData);
  }

  // Role management
  async getRoles(options: RoleListOptions = {}): Promise<RolesListResponse> {
    const params = new URLSearchParams();

    if (options.page) params.append('page', options.page.toString());
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.search) params.append('search', options.search);
    if (options.sortBy) params.append('sortBy', options.sortBy);
    if (options.sortOrder) params.append('sortOrder', options.sortOrder);

    const url = `/roles${params.toString() ? `?${params.toString()}` : ''}`;
    return get<RolesListResponse>(url);
  }

  async getAllRoles(): Promise<Role[]> {
    try {
      const response = await get<{ success: boolean; data: Role[] }>('/roles/all');
      return response.data || [];
    } catch (error) {
      throw new Error((error as ErrorResponse).response?.data?.message || 'Failed to fetch roles');
    }
  }

  async getRoleById(id: number): Promise<Role> {
    return get<Role>(`/roles/${id}`);
  }

  async createRole(roleData: CreateRoleData): Promise<Role> {
    return post<Role>('/roles', roleData);
  }

  async updateRole(id: number, roleData: UpdateRoleData): Promise<Role> {
    return put<Role>(`/roles/${id}`, roleData);
  }

  async deleteRole(id: number): Promise<void> {
    return del<void>(`/roles/${id}`);
  }

  // Permission management
  async getPermissions(options: PermissionListOptions = {}): Promise<PermissionListResult> {
    const params = new URLSearchParams();

    if (options.page) params.append('page', options.page.toString());
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.search) params.append('search', options.search);

    const url = `/permissions${params.toString() ? `?${params.toString()}` : ''}`;
    return get<PermissionListResult>(url);
  }

  async getAllPermissions(): Promise<Permission[]> {
    try {
      const response = await get<{ success: boolean; data: Permission[] }>('/permissions/all');
      return response.data || [];
    } catch (error) {
      throw new Error((error as ErrorResponse).response?.data?.message || 'Failed to fetch permissions');
    }
  }

  // Utility methods
  async searchUsers(query: string, limit: number = 10): Promise<User[]> {
    const result = await this.getUsers({
      search: query,
      limit,
      sortBy: 'name',
      sortOrder: 'asc'
    });
    return result.data?.users || [];
  }

  async getUsersByRole(roleIds: number[], limit: number = 50): Promise<User[]> {
    const result = await this.getUsers({
      roleIds,
      limit,
      sortBy: 'name',
      sortOrder: 'asc'
    });
    return result.data?.users || [];
  }

  async getUserRoles(userId: number): Promise<Role[]> {
    const user = await this.getUserById(userId);
    return user.userRoles.map(ur => ur.role);
  }

  async getRolePermissions(roleId: number): Promise<Permission[]> {
    const role = await this.getRoleById(roleId);
    return role.rolePermissions?.map(rp => rp.permission) || [];
  }

  // Helper method to check if user has specific role
  userHasRole(user: User, roleName: string): boolean {
    return user.userRoles.some(ur => ur.role.name === roleName);
  }

  // Helper method to get user role names
  getUserRoleNames(user: User): string[] {
    return user.userRoles.map(ur => ur.role.name);
  }

  // Helper method to format user display name
  formatUserDisplayName(user: User): string {
    return user.name || user.email;
  }

  // Helper method to format user creation date
  formatUserCreationDate(user: User): string {
    return new Date(user.createdAt).toLocaleDateString();
  }

  // Helper method to check if user account is recently created
  isUserRecentlyCreated(user: User, days: number = 7): boolean {
    const createdDate = new Date(user.createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= days;
  }
}

// Create and export singleton instance
export const usersService = new UsersService();

// Export default for convenience
export default usersService;