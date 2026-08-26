import React, { useEffect, useState, useCallback } from 'react';
import { ThemeContext, type Theme } from './themeContextDefinition';
import { settingsService } from '../services/settingsService';
import { THEME_DEFAULTS, getThemeFromSettings, type ThemeSettings } from '../config/themeDefaults';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system';
    const savedTheme = localStorage.getItem('theme') as Theme;
    return savedTheme || 'system';
  });

  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');
  const [resolvedTheme, setResolvedTheme] = useState<ThemeSettings>(THEME_DEFAULTS);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const applyThemeSettings = useCallback(async () => {
    try {
      const publicSettings = await settingsService.getPublicSettings();
      const themeSettings = getThemeFromSettings(publicSettings);
      setResolvedTheme(themeSettings);

      const hexToRgb = (hex: string): string => {
        if (!hex || !hex.startsWith('#')) return '0, 0, 0';
        
        let r = 0, g = 0, b = 0;
        const cleanHex = hex.slice(1);
        
        if (cleanHex.length === 3) {
          r = parseInt(cleanHex[0] + cleanHex[0], 16);
          g = parseInt(cleanHex[1] + cleanHex[1], 16);
          b = parseInt(cleanHex[2] + cleanHex[2], 16);
        } else if (cleanHex.length >= 6) {
          r = parseInt(cleanHex.slice(0, 2), 16);
          g = parseInt(cleanHex.slice(2, 4), 16);
          b = parseInt(cleanHex.slice(4, 6), 16);
        }
        
        return isNaN(r) || isNaN(g) || isNaN(b) ? '0, 0, 0' : `${r}, ${g}, ${b}`;
      };

      const systemStack = ", system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif";
      const quoteFont = (font: string) => {
        const mainFont = font.split(',')[0].trim();
        return mainFont.includes(' ') ? `'${mainFont}'` : mainFont;
      };

      const colorMix = (color1: string, color2: string, weight: number) => {
        const rgb1 = hexToRgb(color1).split(',').map(n => parseInt(n.trim()));
        const rgb2 = hexToRgb(color2).split(',').map(n => parseInt(n.trim()));
        
        const mixed = rgb1.map((val, i) => {
          const v1 = isNaN(val) ? 0 : val;
          const v2 = isNaN(rgb2[i]) ? 0 : rgb2[i];
          return Math.round(v1 * (1 - weight/100) + v2 * (weight/100));
        });
        return `rgb(${mixed.join(', ')})`;
      };

      const colorToRgba = (color: string, opacity: number) => {
        if (color.startsWith('rgb')) {
          const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
          if (match) {
            return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${opacity})`;
          }
        }
        return `rgba(${hexToRgb(color)}, ${opacity})`;
      };

      let css = ':root {\n';
      
      const addVar = (name: string, value: string) => {
        css += `  ${name}: ${value};\n`;
      };

      // 1. Light Mode
      const l = themeSettings.light;
      addVar('--docmate-primary', l.primary);
      addVar('--docmate-primary-rgb', hexToRgb(l.primary));
      addVar('--docmate-secondary', l.secondary);
      addVar('--docmate-secondary-rgb', hexToRgb(l.secondary));
      addVar('--docmate-success', l.success);
      addVar('--docmate-success-rgb', hexToRgb(l.success));
      addVar('--docmate-warning', l.warning);
      addVar('--docmate-warning-rgb', hexToRgb(l.warning));
      addVar('--docmate-error', l.danger);
      addVar('--docmate-error-rgb', hexToRgb(l.danger));
      addVar('--docmate-bg', l.background);
      addVar('--docmate-bg-rgb', hexToRgb(l.background));
      addVar('--docmate-text', l.text);
      
      const lightSurface = colorMix(l.background, '#000000', 2);
      addVar('--docmate-surface', lightSurface);
      
      const lightSurfaceAlt = colorMix(l.background, '#000000', 4);
      addVar('--docmate-surface-alt', lightSurfaceAlt);
      addVar('--docmate-surface-alt-rgb', hexToRgb(lightSurfaceAlt));
      
      addVar('--docmate-content-bg', l.background);
      addVar('--docmate-nav-bg', colorToRgba(l.background, 0.95));
      addVar('--docmate-card-bg', colorToRgba(lightSurface, 0.9));
      addVar('--docmate-bg-gradient', l.background);
      addVar('--docmate-gradient', l.primary);
      addVar('--docmate-gradient-start', l.primary);
      addVar('--docmate-gradient-end', l.primary);
      addVar('--docmate-gradient-subtle', `rgba(var(--docmate-secondary-rgb), 0.08)`);
      addVar('--docmate-gradient-mixed-subtle', 'var(--docmate-surface-alt)');
      addVar('--docmate-gradient-primary-soft', `rgba(var(--docmate-primary-rgb), 0.08)`);
      addVar('--docmate-bg-effect', 'none');

      addVar('--docmate-font-sans', quoteFont(themeSettings.typography.fontFamily) + systemStack);
      addVar('--docmate-font-heading', quoteFont(themeSettings.typography.headingFont) + systemStack);
      addVar('--docmate-font-body', quoteFont(themeSettings.typography.bodyFont) + systemStack);

      addVar('--docmate-radius-sm', themeSettings.borderRadius.small);
      addVar('--docmate-radius-md', themeSettings.borderRadius.medium);
      addVar('--docmate-radius-lg', themeSettings.borderRadius.large);
      css += '}\n\n';

      // 2. Dark Mode Overrides
      css += '.dark {\n';
      const d = themeSettings.dark;
      addVar('--docmate-primary', d.primary);
      addVar('--docmate-primary-rgb', hexToRgb(d.primary));
      addVar('--docmate-secondary', d.secondary);
      addVar('--docmate-secondary-rgb', hexToRgb(d.secondary));
      addVar('--docmate-success', d.success);
      addVar('--docmate-success-rgb', hexToRgb(d.success));
      addVar('--docmate-warning', d.warning);
      addVar('--docmate-warning-rgb', hexToRgb(d.warning));
      addVar('--docmate-error', d.danger);
      addVar('--docmate-error-rgb', hexToRgb(d.danger));
      addVar('--docmate-bg', d.background);
      addVar('--docmate-bg-rgb', hexToRgb(d.background));
      addVar('--docmate-text', d.text);
      
      const darkSurface = colorMix(d.background, '#ffffff', 4);
      addVar('--docmate-surface', darkSurface);
      
      const darkSurfaceAlt = colorMix(d.background, '#ffffff', 8);
      addVar('--docmate-surface-alt', darkSurfaceAlt);
      addVar('--docmate-surface-alt-rgb', hexToRgb(darkSurfaceAlt));
      
      addVar('--docmate-content-bg', d.background);
      addVar('--docmate-nav-bg', colorToRgba(d.background, 0.95));
      addVar('--docmate-card-bg', colorToRgba(darkSurface, 0.85));
      addVar('--docmate-bg-gradient', d.background);
      addVar('--docmate-gradient', d.primary);
      addVar('--docmate-gradient-start', d.primary);
      addVar('--docmate-gradient-end', d.primary);
      addVar('--docmate-gradient-subtle', `rgba(var(--docmate-secondary-rgb), 0.1)`);
      addVar('--docmate-gradient-mixed-subtle', 'var(--docmate-surface-alt)');
      addVar('--docmate-gradient-primary-soft', `rgba(var(--docmate-primary-rgb), 0.1)`);
      addVar('--docmate-bg-effect', 'none');
      css += '}\n';

      const styleId = 'docmate-dynamic-theme';
      let styleEl = document.getElementById(styleId);
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = css;
    } catch (error) {
      console.error("Failed to apply theme settings:", error);
    }
  }, []);

  useEffect(() => {
    applyThemeSettings();
  }, [applyThemeSettings]);

  useEffect(() => {
    const root = document.documentElement;
    const updateTheme = (resolvedTheme: 'light' | 'dark') => {
      setActualTheme(resolvedTheme);
      root.classList.remove('light', 'dark');
      root.classList.add(resolvedTheme);
      document.body.classList.remove('light', 'dark', 'text-foreground', 'bg-background');
      document.body.classList.add(resolvedTheme, 'text-foreground', 'bg-background');
    };

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const systemTheme = mediaQuery.matches ? 'dark' : 'light';
      updateTheme(systemTheme);
      const handleChange = (e: MediaQueryListEvent) => updateTheme(e.matches ? 'dark' : 'light');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      updateTheme(theme);
    }
  }, [theme]);

  const toggleTheme = () => {
    const sequence: Theme[] = ['light', 'dark', 'system'];
    const next = sequence[(sequence.indexOf(theme) + 1) % sequence.length];
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, actualTheme, resolvedTheme, toggleTheme, setTheme, refreshTheme: applyThemeSettings }}>
      {children}
    </ThemeContext.Provider>
  );
}
