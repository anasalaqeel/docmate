import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  server: {
    proxy: {
      "/v1": "http://localhost:8000",
    },
  },
  plugins: [
    react({
      babel: {
        plugins: [
          ["babel-plugin-react-compiler", {}]
        ]
      }
    }),
    tsconfigPaths(),
    tailwindcss()
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor libraries into separate chunks
          vendor: ['react', 'react-dom'],
          router: ['react-router'],
          ui: ['@heroui/react', '@heroui/theme', '@heroicons/react'],
          motion: ['framer-motion', 'motion'],
          markdown: ['react-markdown', 'remark-gfm', 'rehype-highlight'],
          utils: ['axios', 'js-yaml', 'zod', 'dompurify'],
        },
      },
    },
    // Optimize chunks
    chunkSizeWarningLimit: 1000,
    // Enable source maps for debugging
    sourcemap: false,
  },
});
