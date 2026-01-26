import { createContext, useContext, useState, type ReactNode } from "react";

interface LayoutData {
  headerTitle: string;
  headerVersion?: string;
  showAdminButton: boolean;
  backButton?: {
    to: string;
    label: string;
  };
  sidebar?: ReactNode;
  navbarType: "public" | "admin";
}

interface LayoutContextType {
  layoutData: LayoutData;
  setLayoutData: (data: Partial<LayoutData>) => void;
  resetLayoutData: () => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

const defaultLayoutData: LayoutData = {
  headerTitle: "API Documentation",
  headerVersion: undefined,
  showAdminButton: true,
  sidebar: undefined,
  navbarType: "public",
};

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export const LayoutProvider = ({ children }: { children: ReactNode }) => {
  const [layoutData, setInternalLayoutData] = useState<LayoutData>(defaultLayoutData);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const setLayoutData = (data: Partial<LayoutData>) => {
    setInternalLayoutData((prev) => ({ ...prev, ...data }));
  };

  const resetLayoutData = () => {
    setInternalLayoutData(defaultLayoutData);
  };

  return (
    <LayoutContext.Provider 
      value={{ 
        layoutData, 
        setLayoutData, 
        resetLayoutData,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        isMobileMenuOpen,
        setIsMobileMenuOpen
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
};

export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error("useLayout must be used within a LayoutProvider");
  }
  return context;
};
