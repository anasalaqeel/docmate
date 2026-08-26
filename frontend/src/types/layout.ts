import { createContext } from "react";

export interface LayoutData {
  headerTitle: string;
  headerVersion?: string;
  showAdminButton: boolean;
  backButton?: {
    to: string;
    label: string;
  };
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
  headerTitle: "API Documentation",
  headerVersion: undefined,
  showAdminButton: true,
  sidebar: undefined,
  navbarType: "public",
};

export const LayoutContext = createContext<LayoutContextType | undefined>(undefined);
