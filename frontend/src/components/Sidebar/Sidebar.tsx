import { type ReactNode } from "react";
import { Tooltip } from "@heroui/react";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  children: ReactNode;
  collapsed?: boolean;
  className?: string;
  width?: number | string;
  collapsedWidth?: number | string;
}

/**
 * Base Sidebar component following best practices:
 * - Semantic <aside> tag
 * - Role="navigation" for accessibility
 * - Data-attributes for styling states
 */
export const Sidebar = ({ 
  children, 
  collapsed = false, 
  className = "",
  width = 300,
  collapsedWidth = 80
}: SidebarProps) => {
  return (
    <aside 
      className={`${styles.sidebar} ${className}`}
      data-collapsed={collapsed}
      role="navigation"
      aria-label="Side navigation"
      style={{ 
        "--sidebar-width": typeof width === "number" ? `${width}px` : width,
        "--sidebar-collapsed-width": typeof collapsedWidth === "number" ? `${collapsedWidth}px` : collapsedWidth 
      } as React.CSSProperties}
    >
      <div className={styles.inner}>
        {children}
      </div>
    </aside>
  );
};

interface SidebarItemProps {
  icon: ReactNode;
  label: ReactNode;
  isActive?: boolean;
  onClick?: () => void;
  collapsed?: boolean;
  tooltip?: string;
}

export const SidebarItem = ({ 
  icon, 
  label, 
  isActive, 
  onClick, 
  collapsed,
  tooltip 
}: SidebarItemProps) => {
  const content = (
    <button
      className={styles.item}
      data-active={isActive}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
    >
      <span className={styles.icon}>{icon}</span>
      {!collapsed && <span className={styles.label}>{label}</span>}
    </button>
  );

  if (collapsed && tooltip) {
    return (
      <Tooltip content={tooltip} placement="right" delay={300}>
        {content}
      </Tooltip>
    );
  }

  return content;
};
