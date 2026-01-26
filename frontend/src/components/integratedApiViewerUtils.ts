import type { Documentation } from "../types/docs";
import { getPublicOpenApiSpec } from "../services/docsService";

// Export function to get API endpoints for sidebar
export const getApiEndpoints = async (documentation: Documentation) => {
  try {
    const result = await getPublicOpenApiSpec(documentation.id!);
    if (!result.success) return [];

    const endpoints: Array<{
      id: string;
      title: string;
      method: string;
      path: string;
      tag: string;
    }> = [];

    if (result.data && result.data.paths) {
      Object.entries(result.data.paths).forEach(([path, pathItem]) => {
        Object.entries(pathItem).forEach(([method, operation]) => {
          endpoints.push({
            id: `${method}-${path}`,
            title: operation.summary || `${method.toUpperCase()} ${path}`,
            method: method.toUpperCase(),
            path,
            tag: operation.tags?.[0] || "API",
          });
        });
      });
    }

    return endpoints;
  } catch (error) {
    console.error("Failed to fetch API endpoints:", error);
    return [];
  }
};
