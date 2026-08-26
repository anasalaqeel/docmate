import { useState } from "react";
import { Link } from "react-router";
import type { Documentation } from "../types/docs";
import styles from "../styles/publicDocViewerPage.module.css";

interface ApiEndpoint {
  id: string;
  method: string;
  path: string;
  title: string;
  tag?: string;
  deprecated?: boolean;
}

interface ApiEndpointsSidebarProps {
  doc: Documentation;
  apiEndpoints: ApiEndpoint[];
  selectedEndpointId?: string | null;
}

const ApiEndpointsSidebar: React.FC<ApiEndpointsSidebarProps> = ({
  doc,
  apiEndpoints,
  selectedEndpointId
}) => {
  const [filter, setFilter] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Get method color
  const getMethodColor = (method: string) => {
    const colors = {
      GET: "var(--docmate-success)",
      POST: "var(--docmate-primary)",
      PUT: "var(--docmate-warning)",
      PATCH: "var(--docmate-secondary)",
      DELETE: "var(--docmate-error)"
    };
    return colors[method.toUpperCase() as keyof typeof colors] || "var(--docmate-text-secondary)";
  };

  // Filter endpoints by text, then group by tag
  const term = filter.trim().toLowerCase();
  const visibleEndpoints = term
    ? apiEndpoints.filter(
        (e) =>
          e.title.toLowerCase().includes(term) ||
          e.path.toLowerCase().includes(term) ||
          e.method.toLowerCase().includes(term)
      )
    : apiEndpoints;

  const groupedEndpoints = visibleEndpoints.reduce((acc: Record<string, ApiEndpoint[]>, endpoint) => {
    const tag = endpoint.tag || "General";
    if (!acc[tag]) acc[tag] = [];
    acc[tag].push(endpoint);
    return acc;
  }, {});

  // A group containing the selected endpoint always stays open
  const isCollapsed = (tag: string, endpoints: ApiEndpoint[]) =>
    collapsed.has(tag) && !endpoints.some((e) => e.id === selectedEndpointId);

  const toggleGroup = (tag: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  };

  return (
    <div className={styles.apiEndpointsSection}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionIcon}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M9 1.5 3 9h4l-1 5.5L12 7H8l1-5.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="miter" />
          </svg>
        </span>
        <span className={styles.sectionTitle}>API Reference</span>
        <span className={styles.endpointCount}>
          {visibleEndpoints.length} endpoint{visibleEndpoints.length === 1 ? '' : 's'}
        </span>
      </div>

      {apiEndpoints.length > 8 && (
        <input
          type="text"
          className={styles.endpointFilter}
          placeholder="Filter endpoints"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter endpoints"
        />
      )}

      {Object.entries(groupedEndpoints).map(([tag, endpoints]) => (
        <div key={tag}>
          <button
            className={styles.groupToggle}
            onClick={() => toggleGroup(tag)}
            aria-expanded={!isCollapsed(tag, endpoints)}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              aria-hidden="true"
              className={styles.groupChevron}
              style={{ transform: isCollapsed(tag, endpoints) ? "rotate(-90deg)" : undefined }}
            >
              <path d="M2 3.5 5 6.5 8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {tag}
          </button>
          {!isCollapsed(tag, endpoints) &&
            endpoints.map((endpoint) => {
              const isSelected = selectedEndpointId === endpoint.id;
              const color = getMethodColor(endpoint.method);

              return (
                <Link
                  key={endpoint.id}
                  to={`/docs/${doc.id}?endpoint=${endpoint.id}`}
                  className={`${styles.endpointItem} ${isSelected ? styles.active : ''} ${endpoint.deprecated ? styles.deprecated : ''}`}
                >
                  <div className={styles.methodWrapper}>
                    <span
                      className={styles.method}
                      style={{ color }}
                    >
                      {endpoint.method}
                    </span>
                  </div>
                  <div className={styles.endpointInfo}>
                    <span className={styles.endpointTitle}>{endpoint.title}</span>
                    <span className={styles.endpointPath}>{endpoint.path}</span>
                  </div>
                  {endpoint.deprecated && (
                    <span className={styles.deprecatedTag}>Deprecated</span>
                  )}
                </Link>
              );
            })}
        </div>
      ))}

      {term && visibleEndpoints.length === 0 && (
        <p className={styles.endpointEmpty}>No endpoints match “{filter}”.</p>
      )}
    </div>
  );
};

export default ApiEndpointsSidebar;
