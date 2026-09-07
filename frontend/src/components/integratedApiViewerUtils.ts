import type { Documentation, OpenApiSpec } from "../types/docs";
import { getPublicOpenApiSpec } from "../services/docsService";

// Export function to get API endpoints for sidebar. When a preloaded spec is
// given (versioned views serve the snapshot's spec), no live fetch happens.
export const getApiEndpoints = async (documentation: Documentation, specOverride?: OpenApiSpec | null) => {
  try {
    let spec: OpenApiSpec | undefined = specOverride ?? undefined;
    if (!spec) {
      const result = await getPublicOpenApiSpec(documentation.id!);
      if (!result.success) return [];
      spec = result.data;
    }

    const endpoints: Array<{
      id: string;
      title: string;
      method: string;
      path: string;
      tag: string;
    }> = [];

    if (spec && spec.paths) {
      Object.entries(spec.paths).forEach(([path, pathItem]) => {
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
