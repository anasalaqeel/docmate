import { get, post } from "./httpService";

export interface User {
  id: number;
  name: string;
  email: string;
  userRoles: Array<{
    role: {
      id: number;
      name: string;
      description: string;
    };
  }>;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Auth service functions
export const login = async (credentials: LoginRequest): Promise<ApiResponse<User>> => {
  return post<ApiResponse<User>>("/auth/login", credentials);
};

export const logout = async (): Promise<ApiResponse<null>> => {
  return post<ApiResponse<null>>("/auth/logout");
};

export const getCurrentUser = async (): Promise<ApiResponse<User>> => {
  return get<ApiResponse<User>>("/auth/me");
};

export const register = async (userData: RegisterRequest): Promise<ApiResponse<User>> => {
  return post<ApiResponse<User>>("/auth/register", userData);
};

export const changePassword = async (
  passwordData: ChangePasswordRequest
): Promise<ApiResponse<null>> => {
  return post<ApiResponse<null>>("/auth/change-password", passwordData);
};

// Default export for backwards compatibility
const authService = {
  login,
  logout,
  getCurrentUser,
  register,
  changePassword,
};

export default authService;
