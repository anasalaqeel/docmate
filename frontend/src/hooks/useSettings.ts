import { useState, useEffect } from "react";
import { settingsService } from "../services/settingsService";

// Hook to get a single setting with fallback
export function useSetting<T = unknown>(options: { key: string; fallbackValue: T }) {
  const [value, setValue] = useState<T>(options.fallbackValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSetting = async () => {
      try {
        setLoading(true);
        setError(null);
        const allSettings = await settingsService.getAllSettings();
        const setting = allSettings.find(s => s.key === options.key);
        setValue(setting ? (setting.value as T) : options.fallbackValue);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    loadSetting();
  }, [options.key, options.fallbackValue]);

  const update = async (newValue: T): Promise<boolean> => {
    try {
      setError(null);
      const result = await settingsService.updateSetting(options.key, newValue);
      if (result.success) {
        setValue(newValue);
        return true;
      }
      return false;
    } catch (err) {
      setError((err as Error).message);
      return false;
    }
  };

  const reset = async (): Promise<boolean> => {
    try {
      setError(null);
      const result = await settingsService.resetSetting(options.key);
      if (result.success) {
        setValue(options.fallbackValue);
        return true;
      }
      return false;
    } catch (err) {
      setError((err as Error).message);
      return false;
    }
  };

  return {
    value,
    loading,
    error,
    update,
    reset,
  };
}
