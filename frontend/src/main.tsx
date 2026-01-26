import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { HeroUIProvider } from "@heroui/react";
import { Toaster } from "sonner";
import { AuthProvider } from "./contexts/authContext";
import { ThemeProvider } from "./contexts/themeContext";
import { LayoutProvider } from "./contexts/layoutContext";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <HeroUIProvider>
          <AuthProvider>
            <LayoutProvider>
              <App />
            </LayoutProvider>
            <Toaster
              position="top-right"
              expand={false}
              richColors
              closeButton
              theme="system"
            />
          </AuthProvider>
        </HeroUIProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);
