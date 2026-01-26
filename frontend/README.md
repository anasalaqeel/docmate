# Grud Frontend

The user interface for Grud, built with **React 19** and **Vite**.

## Tech Stack
-   **Framework:** [React 19](https://react.dev/)
-   **Build Tool:** [Vite](https://vitejs.dev/)
-   **Styling:** [Tailwind CSS 4](https://tailwindcss.com/) & [HeroUI](https://heroui.com/)
-   **Animations:** [Framer Motion](https://www.framer.com/motion/)
-   **Icons:** Lucide React, Heroicons

## Key Features
-   **Dynamic Theming:** Light/dark mode, custom colors, gradients, and fonts managed via `ThemeContext`.
-   **Lazy-Loaded Admin Pages:** Improved performance with code splitting.
-   **Protected Routes:** Role-based access control for admin sections.

## Getting Started

### 1. Install Dependencies
```bash
bun install
```

### 2. Run Development Server
```bash
bun run dev
```
Open `http://localhost:5173` in your browser.

### 3. Build for Production
```bash
bun run build
```
The optimized build will be in the `dist/` folder.

## Scripts
| Script | Description |
|---|---|
| `bun run dev` | Start Vite dev server |
| `bun run build` | Build for production |
| `bun run preview` | Preview the production build |
| `bun run lint` | Run ESLint |
