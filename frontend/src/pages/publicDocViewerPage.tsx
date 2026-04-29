import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router";
import {
  Button,
  Spinner,
  Breadcrumbs,
  BreadcrumbItem,
  Chip,
} from "@heroui/react";
import { getPublicDocById } from "../services/docsService";
import type { Documentation, SidebarItem } from "../services/docsService";
import IntegratedApiViewer from "../components/integratedApiViewer";
import { getApiEndpoints } from "../components/integratedApiViewerUtils";
import MarkdownRenderer from "../components/ui/markdownRenderer";
import { useSidebarTree } from "../hooks/useSidebarTree";
import DocSidebar from "../components/DocSidebar";
import NavButton from "../components/NavButton";
import ViewerAttachments from "../components/ViewerAttachments";
import { useLayout } from "../contexts/layoutContext";
import ExportButton from "../components/ExportButton";
import styles from "../styles/publicDocViewerPage.module.css";

const PublicDocViewerPage = () => {
  const { id, pageId } = useParams<{ id: string; pageId?: string }>();
  const [searchParams] = useSearchParams();
  const endpointId = searchParams.get("endpoint");
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

  // Load documentation
  useEffect(() => {
    async function loadDoc() {
      if (!id) return;

      setIsLoading(true);
      try {
        const response = await getPublicDocById(parseInt(id));

        if (response.success && response.data) {
          setDoc(response.data);

          // Load API endpoints for API docs
          if (response.data.type === "api" || response.data.type === "mixed") {
            const endpoints = await getApiEndpoints(response.data);
            setApiEndpoints(endpoints);
          }

          // Auto-navigate to first page if nothing selected
          if (!pageId && !endpointId) {
            const firstPage = findFirstPage(response.data.sidebarItems || []);
            if (firstPage?.page) {
              navigate(`/docs/${id}/page/${firstPage.page.id}`, { replace: true });
            }
          }
        } else {
          navigate("/docs");
        }
      } catch (error) {
        console.error("Failed to fetch documentation:", error);
        navigate("/docs");
      } finally {
        setIsLoading(false);
      }
    }

    loadDoc();

    return () => resetLayoutData();
  }, [id, navigate, pageId, endpointId, findFirstPage]);

  useEffect(() => {
    if (doc) {
      setLayoutData({
        headerTitle: doc.title,
        headerVersion: doc.version?.toString(),
        showAdminButton: false,
        backButton: { to: "/docs", label: "← All Docs" },
        sidebar: (
            <DocSidebar
              doc={doc}
              sidebarTree={sidebarTree}
              apiEndpoints={apiEndpoints}
              pageId={pageId}
            />
          ),
      });
    }
    return () => resetLayoutData();
  }, [doc, sidebarTree, apiEndpoints, pageId, setLayoutData, resetLayoutData]);

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" label="Loading documentation..." />
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

  // Render main content
  return (
    <div className={styles.container}>
      {/* Content wrapper */}
      <div className={styles.content}>
        {/* Main section */}
        <div className={styles.main}>
          {/* Page content with title and breadcrumbs */}
          {pageId && currentPage && !endpointId && (
            <div className={styles.pageContent}>
              <div className={styles.pageHeader}>
                <div className="flex justify-between items-center mb-2">
                  <Breadcrumbs
                    variant="light"
                    classNames={{
                      list: "gap-2",
                    }}
                  >
                    <BreadcrumbItem>{doc.title}</BreadcrumbItem>
                    <BreadcrumbItem>{currentPage.title}</BreadcrumbItem>
                  </Breadcrumbs>
                  <ExportButton 
                    documentId={doc.id} 
                    documentTitle={doc.title} 
                    size="sm" 
                    variant="flat" 
                    className="bg-[var(--grud-surface-alt)] border-1 border-[var(--grud-border-color)] text-[var(--grud-text)] hover:bg-[var(--grud-border-color)] transition-all"
                  />
                </div>
                <h1 className={styles.pageTitle}>{currentPage.title}</h1>
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
                        to={`/docs/${doc.id}/page/${
                          findPreviousPage(sidebarTree, pageId)?.page?.id
                        }`}
                        direction="prev"
                        label="Previous"
                        title={findPreviousPage(sidebarTree, pageId)?.title || ""}
                      />
                    )}
                    {findNextPage(sidebarTree, pageId) && (
                      <NavButton
                        to={`/docs/${doc.id}/page/${
                          findNextPage(sidebarTree, pageId)?.page?.id
                        }`}
                        direction="next"
                        label="Next"
                        title={findNextPage(sidebarTree, pageId)?.title || ""}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* API viewer */}
          {endpointId && (
            <div className={styles.apiViewerSection}>
              <IntegratedApiViewer documentation={doc} selectedEndpoint={endpointId} />
            </div>
          )}

          {/* Welcome section */}
          {!pageId && !endpointId && (
            <div className={styles.welcomeSection}>
              <h1>{doc.title}</h1>
              {doc.description && <p className={styles.docDescription}>{doc.description}</p>}
              <div className={styles.docMeta}>
                <Chip
                  variant="flat"
                  style={{ background: "var(--grud-gradient)", color: "white" }}
                >
                  Version {doc.version}
                </Chip>
                <ExportButton 
                  documentId={doc.id} 
                  documentTitle={doc.title} 
                  size="md" 
                  variant="flat" 
                  className="bg-[var(--grud-surface-alt)] border-1 border-[var(--grud-border-color)] text-[var(--grud-text)] hover:bg-[var(--grud-border-color)] transition-all"
                />
                <span className={styles.author}>Created by {doc.creator?.name || "Unknown"}</span>
              </div>
              <p className={styles.welcomeText}>
                Select a page from the sidebar to view its content.
              </p>

              {/* API spec section */}
              {(doc.type === "api" || doc.type === "mixed") && apiEndpoints.length > 0 && (
                <div className={styles.apiSpecSection}>
                  <h2 className={styles.sectionTitle}>API Documentation</h2>
                  <p>
                    This documentation contains{" "}
                    <strong>
                      {apiEndpoints.length} API endpoint{apiEndpoints.length !== 1 ? "s" : ""}
                    </strong>
                    . Select an endpoint from the "🚀 API Endpoints" section in the sidebar to view
                    detailed information, parameters, and try it out interactively.
                  </p>
                </div>
              )}

              <ViewerAttachments entityId={doc.id!} entityType="documentation" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicDocViewerPage;
