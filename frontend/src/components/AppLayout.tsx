import { type ReactNode, useEffect, useState } from "react";
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Avatar,
} from "@heroui/react";
import { Link, useNavigate } from "react-router";
import { UserCircleIcon, Bars3Icon, BookOpenIcon, Cog6ToothIcon, ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { ThemeToggle } from "./ui/themeToggle";
import { EnhancedButton } from "./ui/enhancedButton";
import { useLayout } from "../hooks/useLayout";
import { useAuth } from "../hooks/useAuth";
import { useBranding } from "../hooks/useBranding";
import styles from "./AppLayout.module.css";

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const { 
    layoutData, 
    isSidebarCollapsed, 
    setIsSidebarCollapsed,
    // isMobileMenuOpen,
    // setIsMobileMenuOpen 
  } = useLayout();
  const { user, logout } = useAuth();
  const { organizationName, logo } = useBranding();
  const navigate = useNavigate();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className={`${styles.root} ${isMounted ? styles.mounted : ""}`}>
      {/* Gradient definition for SVG icons */}
      <svg width="0" height="0" className="absolute pointer-events-none opacity-0" aria-hidden="true">
        <defs>
          <linearGradient id="sidebar-icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--docmate-gradient-start)" />
            <stop offset="100%" stopColor="var(--docmate-gradient-end)" />
          </linearGradient>
        </defs>
      </svg>

      {/* App shell: full-height sidebar on the left, navbar + content column on the right */}
      <div className={styles.shell}>
        {layoutData.sidebar && (
          <div className={styles.sidebarWrapper}>
             {layoutData.sidebar}
          </div>
        )}

        <div className={styles.contentColumn}>
          {/* Navbar section (spans the content column only) */}
          <header>
            <Navbar className={styles.navbar} maxWidth="full">
              <NavbarBrand>
                {layoutData.sidebar ? (
                  <Button
                    isIconOnly
                    variant="light"
                    onPress={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className={styles.sidebarToggle}
                    aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                  >
                    <Bars3Icon className="w-5 h-5" />
                  </Button>
                ) : (
                  <Link to="/docs" className={styles.brandLink}>
                    <div className={styles.brandContent}>
                      <img src={logo} alt="Logo" className={styles.logo} />
                      <span className={styles.brandTitle}>{organizationName}</span>
                    </div>
                  </Link>
                )}
              </NavbarBrand>

              <NavbarContent justify="end">
            <NavbarItem>
              <ThemeToggle size="sm" />
            </NavbarItem>

            {layoutData.showAdminButton && !user && (
              <NavbarItem>
                <EnhancedButton
                  color="primary"
                  variant="flat"
                  startContent={<UserCircleIcon className="w-4 h-4" />}
                  as={Link}
                  to="/admin"
                  animate
                >
                  Admin
                </EnhancedButton>
              </NavbarItem>
            )}

            {user && (
              <NavbarItem>
                <Dropdown placement="bottom-end">
                  <DropdownTrigger>
                    <Avatar 
                      as="button" 
                      className="transition-transform hover:scale-110" 
                      color="primary" 
                      name={user.name} 
                      size="sm" 
                    />
                  </DropdownTrigger>
                  <DropdownMenu aria-label="Profile Actions" variant="flat">
                    <DropdownItem key="profile" className="h-14 gap-2" textValue="Profile">
                      <div className="flex flex-col">
                        <p className="font-semibold text-small">Signed in as</p>
                        <p className="font-bold text-primary">{user.email}</p>
                      </div>
                    </DropdownItem>
                    <DropdownItem 
                        key="admin" 
                        onPress={() => navigate("/admin")}
                        startContent={<Cog6ToothIcon className="w-4 h-4" />}
                        endContent={
                          <a 
                            href="/admin" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-md transition-colors"
                            onClick={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            <ArrowTopRightOnSquareIcon className="w-4 h-4 opacity-50 hover:opacity-100" />
                          </a>
                        }
                    >
                      Admin Panel
                    </DropdownItem>
                    <DropdownItem 
                        key="docs" 
                        onPress={() => navigate("/docs")}
                        startContent={<BookOpenIcon className="w-4 h-4" />}
                        endContent={
                          <a 
                            href="/docs" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-md transition-colors"
                            onClick={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            <ArrowTopRightOnSquareIcon className="w-4 h-4 opacity-50 hover:opacity-100" />
                          </a>
                        }
                    >
                      Documentation
                    </DropdownItem>
                    <DropdownItem key="logout" color="danger" onPress={handleLogout}>
                      Log Out
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </NavbarItem>
            )}
          </NavbarContent>
        </Navbar>
      </header>

          <main className={styles.main}>
            {children}
          </main>

          {!layoutData.sidebar && (
            <footer className={styles.footer}>
              <div className={styles.footerContent}>
                <p>&copy; {new Date().getFullYear()} Docmate. Built with ❤️ for documentation enthusiasts.</p>
              </div>
            </footer>
          )}
        </div>
      </div>
    </div>
  );
};
