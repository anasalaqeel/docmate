import { heroui } from "@heroui/react";

export default heroui({
  addCommonColors: true,
  themes: {
    light: {
      colors: {
        primary: {
          DEFAULT: "#667eea",
          foreground: "#ffffff",
        },
        background: "#f8fafc",
        foreground: "#1e293b",
        secondary: {
          DEFAULT: "#764ba2",
          foreground: "#ffffff",
        },
        success: {
          DEFAULT: "#10b981",
          foreground: "#ffffff",
        },
        warning: {
          DEFAULT: "#f59e0b",
          foreground: "#000000",
        },
        danger: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff",
        },
      },
    },
    dark: {
      colors: {
        primary: {
          DEFAULT: "#667eea",
          foreground: "#ffffff",
        },
        background: "#0f172a",
        foreground: "#f1f5f9",
        secondary: {
          DEFAULT: "#764ba2",
          foreground: "#ffffff",
        },
        success: {
          DEFAULT: "#34d399",
          foreground: "#000000",
        },
        warning: {
          DEFAULT: "#fbbf24",
          foreground: "#000000",
        },
        danger: {
          DEFAULT: "#f87171",
          foreground: "#ffffff",
        },
      },
    },
  },
});
