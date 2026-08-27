import { Link, useNavigate, useLocation } from "react-router";
import {
  HomeIcon,
  BookOpenIcon,
  UsersIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
  UserCircleIcon
} from "@heroicons/react/24/outline";
import { Sidebar, SidebarItem } from "./Sidebar";
import { useBranding } from "../../hooks/useBranding";
import styles from "./AdminSidebar.module.css";

export const AdminSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { organizationName, logo } = useBranding();

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
    {
      key: "account",
      label: "Account",
      icon: UserCircleIcon,
      path: "/admin/account",
    },
  ];

  const isActiveRoute = (path: string) => {
    if (path === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Sidebar>
      <Link
        to="/docs"
        className={styles.brand}
        aria-label={organizationName}
        title={organizationName}
      >
        {logo && <img src={logo} alt="" className={styles.brandLogo} />}
        <span className={styles.brandName}>{organizationName}</span>
      </Link>
      <span className={styles.adminLabel}>Admin Panel</span>
      <nav style={{ padding: '0.5rem 0 1rem 0' }}>
        {sidebarItems.map((item) => (
          <SidebarItem
            key={item.key}
            icon={<item.icon className="w-5 h-5" />}
            label={item.label}
            isActive={isActiveRoute(item.path)}
            onClick={() => navigate(item.path)}
            tooltip={item.label}
          />
        ))}
      </nav>
    </Sidebar>
  );
};
