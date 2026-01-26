import { useNavigate, useSearchParams } from "react-router";
import type { SidebarItem, Documentation } from "../types/docs";
import { TreeView, type TreeNode } from "../common/treeView/treeView";
import { Sidebar } from "./Sidebar/Sidebar";
import ApiEndpointsSidebar from "./ApiEndpointsSidebar";
import styles from "../styles/publicDocViewerPage.module.css";

interface DocSidebarProps {
  doc: Documentation;
  sidebarTree: SidebarItem[];
  apiEndpoints: Array<{
    id: string;
    method: string;
    path: string;
    title: string;
    tag?: string;
  }>;
  pageId?: string;
}

const DocSidebar = ({ doc, sidebarTree, apiEndpoints, pageId }: DocSidebarProps) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const endpointId = searchParams.get("endpoint");

  // Convert sidebar items to TreeView format
  const convertToTreeNodes = (items: SidebarItem[]): TreeNode[] => {
    return items.map((item) => {
      if (item.type === "divider") {
        return {
          id: item.id,
          label: item.title,
          children: item.children ? convertToTreeNodes(item.children) : undefined,
          icon: (
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                textTransform: "uppercase",
                color: "var(--grud-text-secondary)",
              }}
            >
              {item.title}
            </span>
          ),
        };
      }

      const icon = item.type === "folder" ? "📁" : item.icon || "📄";

      return {
        id: item.id,
        label: item.title,
        children: item.children ? convertToTreeNodes(item.children) : undefined,
        icon: <span>{icon}</span>,
      };
    });
  };

  // Get expanded node IDs based on selected page
  const getExpandedNodeIds = (): (string | number)[] => {
    const expandedIds: (string | number)[] = [];

    const findPathToSelected = (items: SidebarItem[], targetPageId: string) => {
      for (const item of items) {
        if (item.page && item.page.id.toString() === targetPageId) {
          return true;
        }
        if (item.children && item.children.length > 0) {
          if (findPathToSelected(item.children, targetPageId)) {
            expandedIds.push(item.id);
            return true;
          }
        }
      }
      return false;
    };

    if (pageId) {
      findPathToSelected(sidebarTree, pageId);
    } else {
      // Expand all folders by default
      const expandAllFolders = (items: SidebarItem[]) => {
        items.forEach((item) => {
          if (item.type === "folder" && item.children && item.children.length > 0) {
            expandedIds.push(item.id);
            expandAllFolders(item.children);
          }
        });
      };
      expandAllFolders(sidebarTree);
    }

    return expandedIds;
  };

  // Find the selected sidebar item ID based on pageId
  const getSelectedNodeId = (): (string | number) | null => {
    if (!pageId) return null;

    const findSidebarItemByPageId = (
      items: SidebarItem[],
      targetPageId: string
    ): SidebarItem | null => {
      for (const item of items) {
        if (item.page && item.page.id.toString() === targetPageId) {
          return item;
        }
        if (item.children) {
          const found = findSidebarItemByPageId(item.children, targetPageId);
          if (found) return found;
        }
      }
      return null;
    };

    const selectedItem = findSidebarItemByPageId(sidebarTree, pageId);
    return selectedItem ? selectedItem.id : null;
  };

  // Handle tree node click
  const handleNodeClick = (node: TreeNode) => {
    // Find the original sidebar item
    const findOriginalItem = (
      items: SidebarItem[],
      nodeId: string | number
    ): SidebarItem | null => {
      for (const item of items) {
        if (item.id === nodeId) {
          return item;
        }
        if (item.children) {
          const found = findOriginalItem(item.children, nodeId);
          if (found) return found;
        }
      }
      return null;
    };

    const originalItem = findOriginalItem(sidebarTree, node.id);
    if (originalItem && originalItem.type === "page" && originalItem.page) {
      navigate(`/docs/${doc.id}/page/${originalItem.page.id}`);
    }
  };

  return (
    <Sidebar collapsed={false} width={320}>
      <div className={styles.sidebarHeader}>
        <h3>Contents</h3>
        <p className={styles.docInfo}>By {doc.creator?.name || "Unknown"}</p>
      </div>

      <div className={styles.sidebarItems}>
        {sidebarTree.length === 0 ? (
          <div className={styles.emptySidebar}>
            <p>No content available</p>
          </div>
        ) : (
          <>
            <TreeView
              data={convertToTreeNodes(sidebarTree)}
              onNodeClick={handleNodeClick}
              defaultExpandedIds={getExpandedNodeIds()}
              selectedNodeId={getSelectedNodeId()}
              classNames={{
                node: "group data-[selected=false]:hover:bg-surface-alt data-[selected=true]:bg-gradient-to-r data-[selected=true]:from-[rgba(var(--grud-primary-rgb),0.1)] data-[selected=true]:to-[rgba(var(--grud-secondary-rgb),0.1)] data-[selected=true]:border-[rgba(var(--grud-primary-rgb),0.2)] border border-transparent",
                nodeLabel:
                  "data-[selected=false]:text-foreground-secondary group-hover:text-foreground group-data-[selected=true]:font-semibold group-data-[selected=true]:bg-gradient-to-r group-data-[selected=true]:from-[var(--grud-primary)] group-data-[selected=true]:to-[var(--grud-secondary)] group-data-[selected=true]:bg-clip-text group-data-[selected=true]:!text-transparent",
              }}
            />

            <ApiEndpointsSidebar
              doc={doc}
              apiEndpoints={apiEndpoints}
              selectedEndpointId={endpointId}
            />
          </>
        )}
      </div>
    </Sidebar>
  );
};

export default DocSidebar;
