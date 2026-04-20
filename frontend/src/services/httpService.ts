import axios from "axios";
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

// Error response type for API calls
export interface ErrorResponse {
  response?: {
    data?: {
      message?: string;
    };
  };
}

// Create axios instance
const instance: AxiosInstance = axios.create({
  baseURL: "/v1",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Setup interceptors
const setupInterceptors = (): void => {
  // Request interceptor
  instance.interceptors.request.use(
    (config) => {
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor
  instance.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      // Handle common errors
      if (error.response?.status === 401) {
        // Unauthorized - could trigger logout
        console.warn("Unauthorized request");
      } else if (error.response?.status === 403) {
        // Forbidden
        console.warn("Forbidden request");
      } else if (error.response?.status >= 500) {
        // Server error
        console.error("Server error:", error.response?.data?.message || "Unknown server error");
      }

      return Promise.reject(error);
    }
  );
};

// Initialize interceptors
setupInterceptors();

// HTTP service functions
export const get = async <T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  const response: AxiosResponse<T> = await instance.get(url, config);
  return response.data;
};

export const post = async <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
  const response: AxiosResponse<T> = await instance.post(url, data, config);
  return response.data;
};

export const put = async <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
  const response: AxiosResponse<T> = await instance.put(url, data, config);
  return response.data;
};

export const patch = async <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
  const response: AxiosResponse<T> = await instance.patch(url, data, config);
  return response.data;
};

export const del = async <T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  const response: AxiosResponse<T> = await instance.delete(url, config);
  return response.data;
};

// Utility function to handle file uploads
export const uploadFile = async <T = unknown>(url: string, file: File, config?: AxiosRequestConfig): Promise<T> => {
  const formData = new FormData();
  formData.append("file", file);

  const response: AxiosResponse<T> = await instance.post(url, formData, {
    ...config,
    headers: {
      ...config?.headers,
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

// Get the Axios instance if needed for advanced usage
export const getInstance = (): AxiosInstance => {
  return instance;
};

// Default export for backwards compatibility
const httpService = {
  get,
  post,
  put,
  patch,
  delete: del,
  uploadFile,
  getInstance,
};

export default httpService;
