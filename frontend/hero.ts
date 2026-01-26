import { heroui } from "@heroui/react";

export default heroui({
  addCommonColors: true,
  themes: {
    light: {
      colors: {
        primary: {
          DEFAULT: "var(--grud-primary)",
          foreground: "#ffffff",
        },
        background: "var(--grud-bg)",
        foreground: "var(--grud-text)",
        secondary: {
          DEFAULT: "var(--grud-secondary)",
          foreground: "#ffffff",
        },
        success: {
          DEFAULT: "var(--grud-success)",
          foreground: "#ffffff",
        },
        warning: {
          DEFAULT: "var(--grud-warning)",
          foreground: "#000000",
        },
        danger: {
          DEFAULT: "var(--grud-error)",
          foreground: "#ffffff",
        },
      },
    },
    dark: {
      colors: {
        primary: {
          DEFAULT: "var(--grud-primary)",
          50: "var(--color-primary-50)",
          100: "var(--color-primary-100)",
          200: "var(--color-primary-200)",
          300: "var(--color-primary-300)",
          400: "var(--color-primary-400)",
          500: "var(--color-primary-500)",
          600: "var(--color-primary-600)",
          700: "var(--color-primary-700)",
          800: "var(--color-primary-800)",
          900: "var(--color-primary-900)",
          foreground: "#ffffff",
        },
        background: "var(--grud-bg)",
        foreground: "var(--grud-text)",
        secondary: {
          DEFAULT: "var(--grud-secondary)",
          50: "var(--color-secondary-50)",
          100: "var(--color-secondary-100)",
          200: "var(--color-secondary-200)",
          300: "var(--color-secondary-300)",
          400: "var(--color-secondary-400)",
          500: "var(--color-secondary-500)",
          600: "var(--color-secondary-600)",
          700: "var(--color-secondary-700)",
          800: "var(--color-secondary-800)",
          900: "var(--color-secondary-900)",
          foreground: "#ffffff",
        },
        success: {
          DEFAULT: "var(--grud-success)",
          foreground: "#000000",
        },
        warning: {
          DEFAULT: "var(--grud-warning)",
          foreground: "#000000",
        },
        danger: {
          DEFAULT: "var(--grud-error)",
          foreground: "#ffffff",
        },
      },
    },
  },
});
