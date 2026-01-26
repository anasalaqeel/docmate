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

      const extractGradientColors = (gradient: string, defaultStart: string, defaultEnd: string) => {
        try {
          const match = gradient.match(/linear-gradient\([^,]+,\s*(#[a-fA-F0-9]{3,8}|rgba?\([^)]+\)|[a-z]+)\s*.*?,\s*(#[a-fA-F0-9]{3,8}|rgba?\([^)]+\)|[a-z]+)/);
          if (match && match.length >= 3) {
            return { start: match[1], end: match[2] };
          }
        } catch (e) {
          console.warn('Failed to parse gradient:', gradient);
        }
        return { start: defaultStart, end: defaultEnd };
      };

      // 1. Light Mode
      const l = themeSettings.light;
      addVar('--grud-primary', l.primary);
      addVar('--grud-primary-rgb', hexToRgb(l.primary));
      addVar('--grud-secondary', l.secondary);
      addVar('--grud-secondary-rgb', hexToRgb(l.secondary));
      addVar('--grud-success', l.success);
      addVar('--grud-success-rgb', hexToRgb(l.success));
      addVar('--grud-warning', l.warning);
      addVar('--grud-warning-rgb', hexToRgb(l.warning));
      addVar('--grud-error', l.danger);
      addVar('--grud-error-rgb', hexToRgb(l.danger));
      addVar('--grud-bg', l.background);
      addVar('--grud-bg-rgb', hexToRgb(l.background));
      addVar('--grud-text', l.text);
      
      const lightSurface = colorMix(l.background, '#000000', 2);
      addVar('--grud-surface', lightSurface);
      
      const lightSurfaceAlt = colorMix(l.background, '#000000', 4);
      addVar('--grud-surface-alt', lightSurfaceAlt);
      addVar('--grud-surface-alt-rgb', hexToRgb(lightSurfaceAlt));
      
      addVar('--grud-content-bg', l.background);
      addVar('--grud-nav-bg', colorToRgba(l.background, 0.95));
      addVar('--grud-card-bg', colorToRgba(lightSurface, 0.9));
      addVar('--grud-bg-gradient', `linear-gradient(135deg, ${l.background} 0%, ${colorMix(l.background, '#000000', 3)} 100%)`);
      addVar('--grud-gradient', themeSettings.options.usePrimaryGradient ? l.gradient : `linear-gradient(0deg, var(--grud-primary), var(--grud-primary))`);
      
      const lightGradientColors = extractGradientColors(l.gradient, l.primary, l.secondary);
      addVar('--grud-gradient-start', themeSettings.options.usePrimaryGradient ? lightGradientColors.start : l.primary);
      addVar('--grud-gradient-end', themeSettings.options.usePrimaryGradient ? lightGradientColors.end : l.primary);
      addVar('--grud-gradient-subtle', themeSettings.options.useSecondaryGradient ? l.gradientSubtle : `linear-gradient(0deg, var(--grud-secondary), var(--grud-secondary))`);
      
      const usePrimary = themeSettings.options.usePrimaryGradient;
      const useSecondary = themeSettings.options.useSecondaryGradient;
      
      addVar('--grud-gradient-mixed-subtle', usePrimary && useSecondary ? 
        `linear-gradient(135deg, rgba(var(--grud-primary-rgb), 0.08) 0%, rgba(var(--grud-secondary-rgb), 0.08) 50%, rgba(var(--grud-primary-rgb), 0.04) 100%)` : 
        `var(--grud-surface-alt)`);
      
      addVar('--grud-gradient-primary-soft', usePrimary ? 
        `linear-gradient(135deg, rgba(var(--grud-primary-rgb), 0.1) 0%, rgba(var(--grud-primary-rgb), 0.05) 100%)` : 
        `rgba(var(--grud-primary-rgb), 0.08)`);

      addVar('--grud-bg-effect', usePrimary ? 
        `radial-gradient(circle at 10% 20%, rgba(var(--grud-primary-rgb), 0.15) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(var(--grud-secondary-rgb), 0.15) 0%, transparent 40%), radial-gradient(circle at 50% 50%, rgba(var(--grud-primary-rgb), 0.05) 0%, transparent 60%)` : 
        `none`);

      addVar('--grud-font-sans', quoteFont(themeSettings.typography.fontFamily) + systemStack);
      addVar('--grud-font-heading', quoteFont(themeSettings.typography.headingFont) + systemStack);
      addVar('--grud-font-body', quoteFont(themeSettings.typography.bodyFont) + systemStack);

      addVar('--grud-radius-sm', themeSettings.borderRadius.small);
      addVar('--grud-radius-md', themeSettings.borderRadius.medium);
      addVar('--grud-radius-lg', themeSettings.borderRadius.large);
      css += '}\n\n';

      // 2. Dark Mode Overrides
      css += '.dark {\n';
      const d = themeSettings.dark;
      addVar('--grud-primary', d.primary);
      addVar('--grud-primary-rgb', hexToRgb(d.primary));
      addVar('--grud-secondary', d.secondary);
      addVar('--grud-secondary-rgb', hexToRgb(d.secondary));
      addVar('--grud-success', d.success);
      addVar('--grud-success-rgb', hexToRgb(d.success));
      addVar('--grud-warning', d.warning);
      addVar('--grud-warning-rgb', hexToRgb(d.warning));
      addVar('--grud-error', d.danger);
      addVar('--grud-error-rgb', hexToRgb(d.danger));
      addVar('--grud-bg', d.background);
      addVar('--grud-bg-rgb', hexToRgb(d.background));
      addVar('--grud-text', d.text);
      
      const darkSurface = colorMix(d.background, '#ffffff', 4);
      addVar('--grud-surface', darkSurface);
      
      const darkSurfaceAlt = colorMix(d.background, '#ffffff', 8);
      addVar('--grud-surface-alt', darkSurfaceAlt);
      addVar('--grud-surface-alt-rgb', hexToRgb(darkSurfaceAlt));
      
      addVar('--grud-content-bg', d.background);
      addVar('--grud-nav-bg', colorToRgba(d.background, 0.95));
      addVar('--grud-card-bg', colorToRgba(darkSurface, 0.85));
      addVar('--grud-bg-gradient', `linear-gradient(135deg, ${d.background} 0%, ${colorMix(d.background, '#000000', 8)} 100%)`);
      addVar('--grud-gradient', themeSettings.options.usePrimaryGradient ? d.gradient : `linear-gradient(0deg, var(--grud-primary), var(--grud-primary))`);
      
      const darkGradientColors = extractGradientColors(d.gradient, d.primary, d.secondary);
      addVar('--grud-gradient-start', themeSettings.options.usePrimaryGradient ? darkGradientColors.start : d.primary);
      addVar('--grud-gradient-end', themeSettings.options.usePrimaryGradient ? darkGradientColors.end : d.primary);
      addVar('--grud-gradient-subtle', themeSettings.options.useSecondaryGradient ? d.gradientSubtle : `linear-gradient(0deg, var(--grud-secondary), var(--grud-secondary))`);
      
      addVar('--grud-gradient-mixed-subtle', themeSettings.options.usePrimaryGradient && themeSettings.options.useSecondaryGradient ? 
        `linear-gradient(135deg, rgba(var(--grud-primary-rgb), 0.12) 0%, rgba(var(--grud-secondary-rgb), 0.12) 50%, rgba(var(--grud-primary-rgb), 0.06) 100%)` : 
        `var(--grud-surface-alt)`);
      
      addVar('--grud-gradient-primary-soft', themeSettings.options.usePrimaryGradient ? 
        `linear-gradient(135deg, rgba(var(--grud-primary-rgb), 0.15) 0%, rgba(var(--grud-primary-rgb), 0.08) 100%)` : 
        `rgba(var(--grud-primary-rgb), 0.12)`);
      
      addVar('--grud-bg-effect', themeSettings.options.usePrimaryGradient ? 
        `radial-gradient(circle at 10% 20%, rgba(var(--grud-primary-rgb), 0.12) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(var(--grud-secondary-rgb), 0.12) 0%, transparent 40%), radial-gradient(circle at 50% 50%, rgba(var(--grud-primary-rgb), 0.06) 100%)` : 
        `none`);
      css += '}\n';

      const styleId = 'grud-dynamic-theme';
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
