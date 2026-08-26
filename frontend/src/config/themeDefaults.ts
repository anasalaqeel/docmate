export const THEME_DEFAULTS = {
  light: {
    primary: "#6d28d9",
    secondary: "#4c1d95",
    success: "#12805c",
    warning: "#b45309",
    danger: "#b91c1c",
    background: "#f8f7fb",
    text: "#1f1832",
    gradient: "linear-gradient(135deg, #6d28d9 0%, #4c1d95 100%)",
    gradientSubtle: "linear-gradient(135deg, rgba(109, 40, 217, 0.08) 0%, rgba(76, 29, 149, 0.08) 100%)",
    surfaceAlt: "#f5f3fa",
  },
  dark: {
    primary: "#8b5cf6",
    secondary: "#a78bfa",
    success: "#34d399",
    warning: "#fbbf24",
    danger: "#f87171",
    background: "#101014",
    text: "#f2f2f5",
    gradient: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
    gradientSubtle: "linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(167, 139, 250, 0.1) 100%)",
    surfaceAlt: "#1e1f24",
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
