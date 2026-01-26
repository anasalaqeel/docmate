import { createContext } from 'react';
import type { ThemeSettings } from '../config/themeDefaults';

export type Theme = 'light' | 'dark' | 'system';

export interface ThemeContextType {
  theme: Theme;
  actualTheme: 'light' | 'dark';
  resolvedTheme: ThemeSettings;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  refreshTheme: () => Promise<void>;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
