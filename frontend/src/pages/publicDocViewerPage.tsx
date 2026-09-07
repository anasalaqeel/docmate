import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams, useLocation, Link } from "react-router";
import { Button, Spinner } from "@heroui/react";
import { getPublicDocById, getPublicDocVersion } from "../services/docsService";
import type { Documentation, SidebarItem } from "../services/docsService";
import IntegratedApiViewer from "../components/integratedApiViewer";
import { getApiEndpoints } from "../components/integratedApiViewerUtils";
import MarkdownRenderer from "../components/ui/markdownRenderer";
import { VersionSelector } from "../components/ui/versionSelector";
import { useSidebarTree } from "../hooks/useSidebarTree";
import DocSidebar from "../components/DocSidebar";
import NavButton from "../components/NavButton";
import ViewerAttachments from "../components/ViewerAttachments";
import { useLayout } from "../hooks/useLayout";
import ExportButton from "../components/ExportButton";
import DocSearchModal from "../components/DocSearchModal";
import AskAiWidget from "../components/AskAi/AskAiWidget";
import styles from "../styles/publicDocViewerPage.module.css";

const PublicDocViewerPage = () => {
  const { id, pageId, version } = useParams<{ id: string; pageId?: string; version?: string }>();
  const [searchParams] = useSearchParams();
  const endpointId = searchParams.get("endpoint");
  const location = useLocation();
  const { setLayoutData, resetLayoutData } = useLayout();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<Documentation | null>(null);
  const [apiEndpoints, setApiEndpoints] = useState<
    Array<{
      id: string;
      method: string;
      path: string;
      title: string;
      tag?: string;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<"not-found" | "network" | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Global shortcut to open doc search with Cmd+K / Ctrl+K or "/"
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
        return;
      }

      const target = e.target as HTMLElement;
      const typing =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if (e.key === "/" && !typing && !isSearchOpen) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSearchOpen]);

  // Get sidebar tree
  const sidebarTree = useSidebarTree(doc?.sidebarItems);

  // Find current page item
  const currentPage = pageId && sidebarTree ? findItemByPageId(sidebarTree, pageId) : null;

  // Helper functions
  function findItemByPageId(items: SidebarItem[], targetPageId: string): SidebarItem | null {
    for (const item of items) {
      if (item.page?.id.toString() === targetPageId) {
        return item;
      }
      if (item.children) {
        const found = findItemByPageId(item.children, targetPageId);
        if (found) return found;
      }
    }
    return null;
  }

  const findFirstPage = useCallback((items: SidebarItem[]): SidebarItem | null => {
    for (const item of items) {
      if (item.type === "page" && item.page) {
        return item;
      }
      if (item.children) {
        const childPage = findFirstPage(item.children);
        if (childPage) return childPage;
      }
    }
    return null;
  }, []);

  // Find a page by slug — used to keep the reader's place when switching versions
  const findPageBySlug = useCallback((items: SidebarItem[], slug: string): SidebarItem | null => {
    for (const item of items) {
      if (item.type === "page" && item.page && item.page.slug === slug) {
        return item;
      }
      if (item.children) {
        const found = findPageBySlug(item.children, slug);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // Version-aware URL helpers: all in-page links stay inside the version view
  const docBasePath = version ? `/docs/${id}/v/${version}` : `/docs/${id}`;
  const pageUrl = useCallback(
    (targetPageId: number | string) => `${docBasePath}/page/${targetPageId}`,
    [docBasePath]
  );

  // Get all pages in order
  const getAllPages = useCallback((items: SidebarItem[]): SidebarItem[] => {
    const pages: SidebarItem[] = [];

    const traverse = (items: SidebarItem[]) => {
      for (const item of items) {
        if (item.type === "page" && item.page) {
          pages.push(item);
        }
        if (item.children) {
          traverse(item.children);
        }
      }
    };

    traverse(items);
    return pages;
  }, []);

  // Find previous page
  const findPreviousPage = useCallback(
    (items: SidebarItem[], currentPageId: string): SidebarItem | null => {
      const allPages = getAllPages(items);
      const currentIndex = allPages.findIndex((page) => page.page?.id.toString() === currentPageId);

      if (currentIndex > 0) {
        return allPages[currentIndex - 1];
      }

      return null;
    },
    [getAllPages]
  );

  // Find next page
  const findNextPage = useCallback(
    (items: SidebarItem[], currentPageId: string): SidebarItem | null => {
      const allPages = getAllPages(items);
      const currentIndex = allPages.findIndex((page) => page.page?.id.toString() === currentPageId);

      if (currentIndex >= 0 && currentIndex < allPages.length - 1) {
        return allPages[currentIndex + 1];
      }

      return null;
    },
    [getAllPages]
  );

  // Fetch the documentation — keyed on id, version and retryCount only, so
  // page/endpoint navigation reuses the already-loaded document. A version
  // label (or "next") loads that snapshot; without one the plain URL resolves
  // to the stable default version, or live content when no default is set.
  useEffect(() => {
    async function loadDoc() {
      if (!id) return;

      setIsLoading(true);
      setLoadError(null);
      try {
        const response = version
          ? await getPublicDocVersion(parseInt(id), version)
          : await getPublicDocById(parseInt(id));

        if (response.success && response.data) {
          setDoc(response.data);

          // Load API endpoints for API docs; versioned responses carry the
          // snapshot's spec so the sidebar matches the version being viewed
          if (response.data.type === "api" || response.data.type === "mixed") {
            const endpoints = await getApiEndpoints(response.data, response.data.openApiSpec);
            setApiEndpoints(endpoints);
          }
        } else {
          setLoadError("not-found");
        }
      } catch (error) {
        console.error("Failed to fetch documentation:", error);
        setLoadError("network");
      } finally {
        setIsLoading(false);
      }
    }

    loadDoc();
  }, [id, version, retryCount]);

  // Auto-navigate to a page when a doc loads with nothing selected. If the
  // reader just switched versions, prefer the page with the same slug so they
  // keep their place.
  useEffect(() => {
    if (!doc || !id || pageId || endpointId) return;
    const stateSlug = (location.state as { slug?: string } | null)?.slug;
    const items = doc.sidebarItems || [];
    const target = (stateSlug ? findPageBySlug(items, stateSlug) : null) ?? findFirstPage(items);
    if (target?.page) {
      navigate(pageUrl(target.page.id), { replace: true });
    }
  }, [doc, id, pageId, endpointId, navigate, findFirstPage, findPageBySlug, pageUrl, location.state]);

  // Version dropdown: switch view while preserving the current page by slug
  const handleVersionChange = useCallback(
    (target: string | null) => {
      if (!id) return;
      const base = target ? `/docs/${id}/v/${target}` : `/docs/${id}`;
      const currentSlug = currentPage?.page?.slug;
      navigate(base, currentSlug ? { state: { slug: currentSlug } } : undefined);
    },
    [id, navigate, currentPage]
  );

  useEffect(() => {
    if (doc) {
      setLayoutData({
        showAdminButton: false,
        navbarTitle: doc.title,
        // The version selector in the navbar is the single version indicator;
        // a separate subtitle would duplicate it.
        navbarExtra:
          doc.versions && doc.versions.length > 0 ? (
            <VersionSelector
              versions={doc.versions}
              current={version ?? null}
              onSelect={handleVersionChange}
            />
          ) : undefined,
        onSearch: () => setIsSearchOpen(true),
        sidebar: (
            <DocSidebar
              doc={doc}
              sidebarTree={sidebarTree}
              apiEndpoints={apiEndpoints}
              pageId={pageId}
              version={version}
            />
          ),
      });
    }
    return () => resetLayoutData();
  }, [doc, sidebarTree, apiEndpoints, pageId, version, handleVersionChange, setLayoutData, resetLayoutData]);

  // Render loading state
  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center min-h-[60vh]"
        role="status"
        aria-live="polite"
      >
        <Spinner size="lg" label="Loading documentation..." />
      </div>
    );
  }

  // Render error state with recovery
  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center" role="alert">
        {loadError === "not-found" ? (
          <>
            <h2 className="text-2xl font-bold">Documentation not found</h2>
            <p className="text-[var(--docmate-text-secondary)]">
              This documentation doesn’t exist or isn’t public.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold">Couldn’t load this documentation</h2>
            <p className="text-[var(--docmate-text-secondary)]">
              The request failed — check your connection and try again.
            </p>
          </>
        )}
        <div className="flex gap-3">
          {loadError === "network" && (
            <Button color="primary" onPress={() => setRetryCount((n) => n + 1)}>
              Try again
            </Button>
          )}
          <Button as={Link} to="/docs" variant="flat">
            Back to all docs
          </Button>
        </div>
      </div>
    );
  }

  // Render error state
  if (!doc) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <h2 className="text-2xl font-bold">Documentation not found</h2>
        <Button as={Link} to="/docs" color="primary">
          Back to all docs
        </Button>
      </div>
    );
  }

  // Version banners: old snapshots get a switch-to-stable notice, the "next"
  // draft view gets a lighter note
  const defaultVersion = doc.versions?.find((v) => v.isDefault);
  const showOldVersionBanner =
    !!version && version !== "next" && !!doc.viewedVersion && !doc.viewedVersion.isDefault;
  const showDraftNote = version === "next";

  // Render main content
  return (
    <div className={styles.container}>
      <a href="#docs-main" className={styles.skipLink}>
        Skip to content
      </a>
      {/* Content wrapper */}
      <div className={styles.content}>
        {/* Main section */}
        <main id="docs-main" className={styles.main}>
          {showOldVersionBanner && (
            <div
              className="mb-6 px-4 py-3 rounded-xl border border-[var(--docmate-border-color)] bg-[var(--docmate-surface-alt)] text-sm flex flex-wrap items-center gap-x-2 gap-y-1"
              role="note"
            >
              <span>
                You’re viewing <strong>v{version}</strong>
                {doc.viewedVersion?.changelog ? ` — ${doc.viewedVersion.changelog}` : ""}
              </span>
              <span className="text-[var(--docmate-text-secondary)]">
                This content may be out of date.
              </span>
              <Button
                as={Link}
                to={`/docs/${doc.id}`}
                size="sm"
                variant="flat"
                color="primary"
                className="ml-auto"
              >
                {defaultVersion ? `Go to v${defaultVersion.version} (stable)` : "Go to latest"}
              </Button>
            </div>
          )}
          {showDraftNote && (
            <div
              className="mb-6 px-4 py-3 rounded-xl border border-[var(--docmate-border-color)] bg-[var(--docmate-surface-alt)] text-sm text-[var(--docmate-text-secondary)]"
              role="note"
            >
              You’re viewing the <strong>next (draft)</strong> version — the latest edits, not yet
              cut as a stable release.
            </div>
          )}

          {/* Page content with title and breadcrumbs */}
          {pageId && currentPage && !endpointId && (
            <div className={styles.pageContent}>
              <div className={styles.pageHeader}>
                <div className={styles.pageToolbar}>
                  <nav className={styles.breadcrumb} aria-label="Breadcrumb">
                    <Link to="/docs" className={styles.breadcrumbLink}>docs</Link>
                    <span className={styles.breadcrumbSep}>/</span>
                    <Link to={docBasePath} className={styles.breadcrumbLink}>{doc.title}</Link>
                    <span className={styles.breadcrumbSep}>/</span>
                    <span className={styles.breadcrumbCurrent} aria-current="page">{currentPage.title}</span>
                  </nav>
                    <ExportButton
                      documentId={doc.id!}
                      documentTitle={doc.title}
                      size="sm"
                      variant="flat"
                      className="bg-[var(--docmate-surface-alt)] border-1 border-[var(--docmate-border-color)] text-[var(--docmate-text)] hover:bg-[var(--docmate-border-color)] transition-all"
                    />
                  </div>
                  <h1
                    className={styles.pageTitle}
                    style={{ viewTransitionName: `doc-title-${doc.id}` } as React.CSSProperties}
                  >
                    {currentPage.title}
                  </h1>
                </div>

              {currentPage.page?.content?.description ? (
                <MarkdownRenderer
                  content={currentPage.page.content.description}
                  pageId={currentPage.page.id}
                  docId={doc.id}
                />
              ) : (
                <div className={styles.emptyContent}>
                  <p>No content available for this page.</p>
                </div>
              )}

              {currentPage.page && (
                <ViewerAttachments entityId={currentPage.page.id} entityType="page" />
              )}

              {/* Page navigation */}
              {sidebarTree && (
                <div className={styles.navFooter}>
                  <div className={styles.navFooterContent}>
                    {findPreviousPage(sidebarTree, pageId) && (
                      <NavButton
                        to={pageUrl(findPreviousPage(sidebarTree, pageId)!.page!.id)}
                        direction="prev"
                        label="Previous"
                        title={findPreviousPage(sidebarTree, pageId)?.title || ""}
                      />
                    )}
                    {findNextPage(sidebarTree, pageId) && (
                      <NavButton
                        to={pageUrl(findNextPage(sidebarTree, pageId)!.page!.id)}
                        direction="next"
                        label="Next"
                        title={findNextPage(sidebarTree, pageId)?.title || ""}
                      />
                    )}
                  </div>
                  {!findNextPage(sidebarTree, pageId) && sidebarTree.length > 0 && (
                    <p className={styles.endNote}>
                      You’ve reached the end of this documentation.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* API viewer */}
          {endpointId && (
            <div className={styles.apiViewerSection}>
              <IntegratedApiViewer
                documentation={doc}
                selectedEndpoint={endpointId}
                spec={doc.openApiSpec}
              />
            </div>
          )}

          {/* Welcome section */}
          {!pageId && !endpointId && (
            <div className={styles.welcomeSection}>
              <h1>{doc.title}</h1>
              {doc.description && <p className={styles.docDescription}>{doc.description}</p>}
              <div className={styles.docMeta}>
                <span className={styles.welcomeVersion}>Version {doc.version}</span>
                <span className={styles.author}>
                  {doc.creator?.name}
                </span>
                <ExportButton
                  documentId={doc.id!}
                  documentTitle={doc.title}
                  size="md"
                  variant="flat"
                  className="bg-[var(--docmate-surface-alt)] border-1 border-[var(--docmate-border-color)] text-[var(--docmate-text)] hover:bg-[var(--docmate-border-color)] transition-all"
                />
              </div>
              <p className={styles.welcomeText}>
                {sidebarTree.length === 0
                  ? "This documentation doesn’t have any pages yet."
                  : "Select a page from the sidebar to start reading."}
              </p>

              {/* API spec section */}
              {(doc.type === "api" || doc.type === "mixed") && apiEndpoints.length > 0 && (
                <div className={styles.apiSpecSection}>
                  <h2 className={styles.sectionTitle}>API Reference</h2>
                  <p>
                    This documentation contains{" "}
                    <strong>
                      {apiEndpoints.length} endpoint{apiEndpoints.length !== 1 ? "s" : ""}
                    </strong>
                    . Open an entry under API ENDPOINTS in the sidebar to view
                    parameters, responses, and try it out interactively.
                  </p>
                </div>
              )}

              <ViewerAttachments entityId={doc.id!} entityType="documentation" />
            </div>
          )}
        </main>
      </div>

      <DocSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        doc={doc}
        sidebarTree={sidebarTree}
        apiEndpoints={apiEndpoints}
        version={version}
      />

      {doc && (
        <AskAiWidget
          docId={doc.id}
          pageId={currentPage?.page?.id}
          docTitle={doc.title}
          pageTitle={currentPage?.title}
          variant="public"
        />
      )}
    </div>
  );
};

export default PublicDocViewerPage;
