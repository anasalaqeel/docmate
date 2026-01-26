export const THEME_DEFAULTS = {
  light: {
    primary: "#667eea",
    secondary: "#764ba2",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
    background: "#f8fafc",
    text: "#1e293b",
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    gradientSubtle: "linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)",
    surfaceAlt: "#f8fafc",
  },
  dark: {
    primary: "#667eea",
    secondary: "#764ba2",
    success: "#34d399",
    warning: "#fbbf24",
    danger: "#f87171",
    background: "#0f172a",
    text: "#f1f5f9",
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    gradientSubtle: "linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)",
    surfaceAlt: "#334155",
  },
  options: {
    usePrimaryGradient: true,
    useSecondaryGradient: true,
  },
  typography: {
    fontFamily: "Inter",
    headingFont: "Inter",
    bodyFont: "Inter",
    codeFont: "JetBrains Mono",
  },
  borderRadius: {
    small: "0.25rem",
    medium: "0.375rem",
    large: "0.5rem",
  },
};

export type ThemeSettings = typeof THEME_DEFAULTS;

export const getThemeFromSettings = (settings: any[]): ThemeSettings => {
  const getVal = (key: string, fallback: any) => {
    const s = settings.find((s) => s.key === key);
    if (!s || s.value === undefined || s.value === null) return fallback;
    
    // Handle string booleans from backend if any
    if (typeof fallback === 'boolean') {
      return s.value === 'true' || s.value === true;
    }
    return s.value;
  };

  return {
    light: {
      primary: getVal("theme.colors.primary", THEME_DEFAULTS.light.primary),
      secondary: getVal("theme.colors.secondary", THEME_DEFAULTS.light.secondary),
      success: getVal("theme.colors.success", THEME_DEFAULTS.light.success),
      warning: getVal("theme.colors.warning", THEME_DEFAULTS.light.warning),
      danger: getVal("theme.colors.danger", THEME_DEFAULTS.light.danger),
      background: getVal("theme.colors.background", THEME_DEFAULTS.light.background),
      text: getVal("theme.colors.text", THEME_DEFAULTS.light.text),
      gradient: getVal("theme.colors.gradient", THEME_DEFAULTS.light.gradient),
      gradientSubtle: getVal("theme.colors.gradientSubtle", THEME_DEFAULTS.light.gradientSubtle),
      surfaceAlt: getVal("theme.colors.surfaceAlt", THEME_DEFAULTS.light.surfaceAlt),
    },
    dark: {
      primary: getVal("theme.dark.colors.primary", THEME_DEFAULTS.dark.primary),
      secondary: getVal("theme.dark.colors.secondary", THEME_DEFAULTS.dark.secondary),
      success: getVal("theme.dark.colors.success", THEME_DEFAULTS.dark.success),
      warning: getVal("theme.dark.colors.warning", THEME_DEFAULTS.dark.warning),
      danger: getVal("theme.dark.colors.danger", THEME_DEFAULTS.dark.danger),
      background: getVal("theme.dark.colors.background", THEME_DEFAULTS.dark.background),
      text: getVal("theme.dark.colors.text", THEME_DEFAULTS.dark.text),
      gradient: getVal("theme.dark.colors.gradient", THEME_DEFAULTS.dark.gradient),
      gradientSubtle: getVal("theme.dark.colors.gradientSubtle", THEME_DEFAULTS.dark.gradientSubtle),
      surfaceAlt: getVal("theme.dark.colors.surfaceAlt", THEME_DEFAULTS.dark.surfaceAlt),
    },
    options: {
      usePrimaryGradient: getVal("theme.options.usePrimaryGradient", THEME_DEFAULTS.options.usePrimaryGradient),
      useSecondaryGradient: getVal("theme.options.useSecondaryGradient", THEME_DEFAULTS.options.useSecondaryGradient),
    },
    typography: {
      fontFamily: getVal("theme.typography.fontFamily", THEME_DEFAULTS.typography.fontFamily),
      headingFont: getVal("theme.typography.headingFont", THEME_DEFAULTS.typography.headingFont),
      bodyFont: getVal("theme.typography.bodyFont", THEME_DEFAULTS.typography.bodyFont),
      codeFont: getVal("theme.typography.codeFont", THEME_DEFAULTS.typography.codeFont),
    },
    borderRadius: {
      small: getVal("theme.borderRadius.small", THEME_DEFAULTS.borderRadius.small),
      medium: getVal("theme.borderRadius.medium", THEME_DEFAULTS.borderRadius.medium),
      large: getVal("theme.borderRadius.large", THEME_DEFAULTS.borderRadius.large),
    },
  };
};
