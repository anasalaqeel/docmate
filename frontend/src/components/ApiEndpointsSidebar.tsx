import React from "react";
import { Link } from "react-router";
import { type Documentation } from "../types/docs";
import styles from "../styles/publicDocViewerPage.module.css";

interface ApiEndpoint {
  id: string;
  method: string;
  path: string;
  title: string;
  tag?: string;
  summary?: string;
  description?: string;
  deprecated?: boolean;
  parameters?: Array<{
    name: string;
    in: 'path' | 'query' | 'header' | 'cookie';
    required?: boolean;
    description?: string;
  }>;
  responses?: Record<string, {
    description?: string;
  }>;
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
  // Get method color
  const getMethodColor = (method: string) => {
    const colors = {
      GET: "var(--grud-success)",
      POST: "var(--grud-primary)",
      PUT: "var(--grud-warning)",
      PATCH: "var(--grud-secondary)",
      DELETE: "var(--grud-error)"
    };
    return colors[method.toUpperCase() as keyof typeof colors] || "var(--grud-text-secondary)";
  };

  // Group endpoints by tag
  const groupedEndpoints = apiEndpoints.reduce((acc: Record<string, ApiEndpoint[]>, endpoint) => {
    const tag = endpoint.tag || "General";
    if (!acc[tag]) acc[tag] = [];
    acc[tag].push(endpoint);
    return acc;
  }, {});

  return (
    <div className={styles.apiEndpointsSection}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionIcon}>⚡</span>
        <span className={styles.sectionTitle}>API Reference</span>
        <span className={styles.endpointCount}>
          {apiEndpoints.length} endpoint{apiEndpoints.length === 1 ? '' : 's'}
        </span>
      </div>

      {Object.entries(groupedEndpoints).map(([tag, endpoints]) => (
        <div key={tag}>
          <div className={styles.groupLabel}>{tag}</div>
          {endpoints.map((endpoint) => {
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
                {isSelected && (
                  <div className={styles.selectedIndicator} />
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default ApiEndpointsSidebar;