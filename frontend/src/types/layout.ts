import { createContext } from "react";

export interface LayoutData {
  showAdminButton: boolean;
  sidebar?: React.ReactNode;
  navbarType: "public" | "admin";
}

export interface LayoutContextType {
  layoutData: LayoutData;
  setLayoutData: (data: Partial<LayoutData>) => void;
  resetLayoutData: () => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

export const defaultLayoutData: LayoutData = {
  showAdminButton: true,
  sidebar: undefined,
  navbarType: "public",
};

export const LayoutContext = createContext<LayoutContextType | undefined>(undefined);
