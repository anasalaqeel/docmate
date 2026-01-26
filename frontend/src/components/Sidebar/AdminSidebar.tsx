import { useNavigate, useLocation } from "react-router";
import { 
  HomeIcon, 
  BookOpenIcon, 
  UsersIcon, 
  ShieldCheckIcon, 
  Cog6ToothIcon 
} from "@heroicons/react/24/outline";
import { Sidebar, SidebarItem } from "./Sidebar";
import { useLayout } from "../../contexts/layoutContext";

export const AdminSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSidebarCollapsed } = useLayout();

  const sidebarItems = [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: HomeIcon,
      path: "/admin",
    },
    {
      key: "docs",
      label: "Documentation",
      icon: BookOpenIcon,
      path: "/admin/docs",
    },
    {
      key: "users",
      label: "Users",
      icon: UsersIcon,
      path: "/admin/users",
    },
    {
      key: "roles",
      label: "Roles",
      icon: ShieldCheckIcon,
      path: "/admin/roles",
    },
    {
      key: "settings",
      label: "Settings",
      icon: Cog6ToothIcon,
      path: "/admin/settings",
    },
  ];

  const isActiveRoute = (path: string) => {
    if (path === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Sidebar collapsed={isSidebarCollapsed}>
      <nav style={{ padding: '1rem 0' }}>
        {sidebarItems.map((item) => (
          <SidebarItem
            key={item.key}
            icon={<item.icon className="w-5 h-5" />}
            label={item.label}
            isActive={isActiveRoute(item.path)}
            onClick={() => navigate(item.path)}
            collapsed={isSidebarCollapsed}
            tooltip={item.label}
          />
        ))}
      </nav>
    </Sidebar>
  );
};
