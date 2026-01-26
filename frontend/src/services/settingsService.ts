import { get, post, patch, del } from "./httpService";
import type {
  Setting,
  SettingsListResult,
  SettingsQueryOptions,
  ApiResult,
  UploadType,
  FileUploadData
} from "../types/settings";

export class SettingsService {
  async getSettings(options: SettingsQueryOptions = {}): Promise<SettingsListResult> {
    const params = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value) params.append(key, value.toString());
    });

    const response = await get<{ success: boolean; data: SettingsListResult; message: string }>(
      `/settings${params.toString() ? `?${params.toString()}` : ''}`
    );
    if (!response.success) throw new Error(response.message);
    return response.data;
  }

  async getAllSettings(): Promise<Setting[]> {
    const response = await get<{ success: boolean; data: Setting[]; message: string }>('/settings/all');
    if (!response.success) throw new Error(response.message);
    return response.data;
  }

  async updateSetting(key: string, value: unknown): Promise<ApiResult<Setting[]>> {
    const response = await patch<{ success: boolean; data: Setting; message: string; errors?: Record<string, string> }>(
      `/settings/${encodeURIComponent(key)}`,
      { value }
    );
    return {
      success: response.success,
      message: response.message,
      data: [response.data],
      errors: response.errors
    };
  }

  async updateSettings(settings: Record<string, unknown>): Promise<ApiResult<Setting[]>> {
    const response = await patch<{ success: boolean; data: Setting[]; message: string; errors?: Record<string, string> }>(
      '/settings/bulk',
      { settings }
    );
    return {
      success: response.success,
      message: response.message,
      data: response.data,
      errors: response.errors
    };
  }

  async resetSetting(key: string): Promise<ApiResult> {
    const response = await del<{ success: boolean; message: string }>(`/settings/${encodeURIComponent(key)}`);
    return {
      success: response.success,
      message: response.message
    };
  }

  async resetCategory(category: string): Promise<ApiResult> {
    const response = await del<{ success: boolean; message: string }>(`/settings/category/${encodeURIComponent(category)}`);
    return {
      success: response.success,
      message: response.message
    };
  }

  async exportSettings(): Promise<ApiResult<Record<string, unknown>>> {
    const response = await get<{ success: boolean; data: Record<string, unknown>; message: string }>('/settings/export');
    return {
      success: response.success,
      message: response.message,
      data: response.data
    };
  }

  async importSettings(settings: Record<string, unknown>): Promise<ApiResult<{ current: Record<string, unknown>; importCount: number }>> {
    const response = await post<{
      success: boolean;
      data: { current: Record<string, unknown>; importCount: number };
      message: string;
      errors?: Record<string, string>;
    }>('/settings/import', { settings });
    return {
      success: response.success,
      message: response.message,
      data: response.data,
      errors: response.errors
    };
  }

  async uploadFile(file: File, type: UploadType): Promise<ApiResult<FileUploadData>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploadType', type);

    const response = await post<{ success: boolean; data: FileUploadData; message: string }>(
      '/settings/upload',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return {
      success: response.success,
      message: response.message,
      data: response.data
    };
  }

  async getSettingsByCategory(category: string): Promise<Setting[]> {
    const allSettings = await this.getAllSettings();
    return allSettings.filter(setting => setting.category === category);
  }

  async getPublicSettings(): Promise<Setting[]> {
    const response = await get<{ success: boolean; data: Setting[]; message: string }>('/settings/public');
    if (!response.success) throw new Error(response.message);
    return response.data;
  }
}

export const settingsService = new SettingsService();
export default settingsService;
