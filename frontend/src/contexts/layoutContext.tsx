import { useCallback, useMemo, useState, type ReactNode } from "react";
import { LayoutContext, defaultLayoutData } from "../types/layout";

export const LayoutProvider = ({ children }: { children: ReactNode }) => {
  const [layoutData, setInternalLayoutData] = useState(defaultLayoutData);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarPeek, setIsSidebarPeek] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const setLayoutData = useCallback((data: Partial<typeof defaultLayoutData>) => {
    setInternalLayoutData((prev) => ({ ...prev, ...data }));
  }, []);

  const resetLayoutData = useCallback(() => {
    setInternalLayoutData(defaultLayoutData);
  }, []);

  const value = useMemo(
    () => ({
      layoutData,
      setLayoutData,
      resetLayoutData,
      isSidebarCollapsed,
      setIsSidebarCollapsed,
      isSidebarPeek,
      setIsSidebarPeek,
      isMobileMenuOpen,
      setIsMobileMenuOpen,
    }),
    [layoutData, setLayoutData, resetLayoutData, isSidebarCollapsed, isSidebarPeek, isMobileMenuOpen]
  );

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
};
