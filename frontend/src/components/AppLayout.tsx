import { type ReactNode, useEffect, useRef, useState } from "react";
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
import { UserCircleIcon, Bars3Icon, BookOpenIcon, Cog6ToothIcon, ArrowTopRightOnSquareIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { ThemeToggle } from "./ui/themeToggle";
import { EnhancedButton } from "./ui/enhancedButton";
import { useLayout } from "../hooks/useLayout";
import { useAuth } from "../hooks/useAuth";
import { useBranding } from "../hooks/useBranding";
import styles from "./AppLayout.module.css";

interface AppLayoutProps {
  children: ReactNode;
}

/* Peek overlay: slides in over the content with a transform (never affects layout).
   Uses keyframe animations (not transitions) so the slide reliably plays on mount. */
const SidebarPeekOverlay = ({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) => {
  const [render, setRender] = useState(open);

  useEffect(() => {
    if (open) {
      setRender(true);
      return;
    }
    const t = setTimeout(() => setRender(false), 200);
    return () => clearTimeout(t);
  }, [open]);

  if (!render) return null;

  return (
    <div
      className={styles.sidebarPeekOverlay}
      data-open={open ? "true" : "false"}
      // While sliding out the overlay is no longer interactive
      inert={!open ? true : undefined}
      onMouseLeave={onClose}
    >
      {children}
    </div>
  );
};

export const AppLayout = ({ children }: AppLayoutProps) => {
  const {
    layoutData,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isSidebarPeek,
    setIsSidebarPeek,
  } = useLayout();
  const { user, logout } = useAuth();
  const { organizationName, logo } = useBranding();
  const navigate = useNavigate();
  const [isMounted, setIsMounted] = useState(false);
  const [overlayHold, setOverlayHold] = useState(false);
  const overlayHoldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peekIntentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    return () => {
      if (overlayHoldTimer.current) clearTimeout(overlayHoldTimer.current);
      if (peekIntentTimer.current) clearTimeout(peekIntentTimer.current);
    };
  }, []);

  // Escape closes a peeked sidebar
  useEffect(() => {
    if (!isSidebarPeek) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsSidebarPeek(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSidebarPeek, setIsSidebarPeek]);

  const releaseOverlayHold = () => {
    if (overlayHoldTimer.current) {
      clearTimeout(overlayHoldTimer.current);
      overlayHoldTimer.current = null;
    }
    setOverlayHold(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Pin/unpin via the hamburger. Pinning from a peek keeps the overlay open
  // until the flow sidebar has finished expanding beneath it, then releases it.
  const toggleSidebar = () => {
    setIsSidebarPeek(false);
    if (!isSidebarCollapsed) {
      releaseOverlayHold();
      setIsSidebarCollapsed(true);
      return;
    }
    if (isSidebarPeek) {
      releaseOverlayHold();
      setOverlayHold(true);
      overlayHoldTimer.current = setTimeout(() => {
        overlayHoldTimer.current = null;
        setOverlayHold(false);
      }, 380);
    }
    setIsSidebarCollapsed(false);
  };

  const sidebarHidden = !!layoutData.sidebar && isSidebarCollapsed;

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
          <div
            className={styles.sidebarWrapper}
            data-hidden={isSidebarCollapsed ? "true" : "false"}
            // A hidden sidebar must not hold focus or screen-reader content
            inert={isSidebarCollapsed ? true : undefined}
          >
             {layoutData.sidebar}
          </div>
        )}

        {/* Peek overlay: the hidden sidebar slides over the content while hovered */}
        {layoutData.sidebar && sidebarHidden && (
          <SidebarPeekOverlay
            open={isSidebarPeek || overlayHold}
            onClose={() => setIsSidebarPeek(false)}
          >
            {layoutData.sidebar}
          </SidebarPeekOverlay>
        )}

        {/* Left-edge reveal zone: pausing on it (or clicking) peeks the hidden sidebar open.
            A short intent delay keeps pass-through mouse movement toward content from triggering it. */}
        {sidebarHidden && !isSidebarPeek && (
          <button
            type="button"
            className={styles.edgeReveal}
            onMouseEnter={() => {
              if (peekIntentTimer.current) clearTimeout(peekIntentTimer.current);
              peekIntentTimer.current = setTimeout(() => {
                peekIntentTimer.current = null;
                setIsSidebarPeek(true);
              }, 180);
            }}
            onMouseLeave={() => {
              if (peekIntentTimer.current) {
                clearTimeout(peekIntentTimer.current);
                peekIntentTimer.current = null;
              }
            }}
            onClick={() => {
              if (peekIntentTimer.current) {
                clearTimeout(peekIntentTimer.current);
                peekIntentTimer.current = null;
              }
              setIsSidebarPeek(true);
            }}
            aria-label="Open navigation"
          >
            <span className={styles.edgeHandle} aria-hidden="true">
              <ChevronRightIcon className="w-3.5 h-3.5" />
            </span>
          </button>
        )}

        <div className={styles.contentColumn}>
          {/* Navbar section (spans the content column only) */}
          <header>
            <Navbar className={styles.navbar} maxWidth="full">
              <NavbarBrand>
                {layoutData.sidebar ? (
                  <>
                    <Button
                      isIconOnly
                      variant="light"
                      onPress={toggleSidebar}
                      className={styles.sidebarToggle}
                      aria-label={isSidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
                    >
                      <Bars3Icon className="w-5 h-5" />
                    </Button>
                    {layoutData.navbarTitle && (
                      <div className={styles.navTitleBlock}>
                        <span className={styles.navTitle} title={layoutData.navbarTitle}>
                          {layoutData.navbarTitle}
                        </span>
                        {layoutData.navbarSubtitle && (
                          <span className={styles.navSubtitle}>{layoutData.navbarSubtitle}</span>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <Link to="/docs" className={styles.brandLink}>
                    <div className={styles.brandContent}>
                      {logo && <img src={logo} alt="Logo" className={styles.logo} />}
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
