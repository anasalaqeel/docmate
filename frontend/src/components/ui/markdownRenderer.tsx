import React, { useState, useEffect, type JSX } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import CopyButton from "./CopyButton";
import OpenApiOperationBlock from "./openApiOperationBlock";
import EmbeddedOperationViewer from "./embeddedOperationViewer";
import httpService from "../../services/httpService";
import type { OpenApiSpec } from "../../types/docs";
import { z } from "zod";

interface MarkdownRendererProps {
  content: string;
  pageId?: number;
  docId?: number; // Required for fetching OpenAPI spec for operation-ref
}

// Zod schemas for validation
const ParameterSchema = z.object({
  name: z.string(),
  in: z.enum(["query", "header", "path", "cookie"]),
  description: z.string().optional(),
  required: z.boolean().optional(),
  schema: z.record(z.string(), z.unknown()).optional(),
});

const ResponseSchema = z.record(
  z.string(),
  z.object({
    description: z.string(),
    content: z.record(z.string(), z.unknown()).optional(),
  })
);

const SecurityRequirementSchema = z.object({
  type: z.string(),
  name: z.string().optional(),
  in: z.string().optional(),
  scheme: z.string().optional(),
  bearerFormat: z.string().optional(),
});

const SecuritySchema = z.array(SecurityRequirementSchema);

// Parse and remove frontmatter from markdown content
function parseFrontmatter(content: string): { frontmatter: Record<string, any>; content: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (match) {
    // Simple YAML parsing - just extract basic key-value pairs
    const frontmatterText = match[1];
    const markdownContent = match[2];
    const frontmatter: Record<string, any> = {};

    // Simple YAML parser for key-value pairs
    const lines = frontmatterText.split('\n');
    for (const line of lines) {
      const keyValueMatch = line.match(/^\s*(.+?):\s*(.+?)\s*$/);
      if (keyValueMatch) {
        const [, key, value] = keyValueMatch;
        // Remove quotes if present
        const cleanValue = value.replace(/^["'](.*)["']$/, '$1');
        frontmatter[key.trim()] = cleanValue;
      }
    }

    return { frontmatter, content: markdownContent };
  }

  return { frontmatter: {}, content };
}

// Safe JSON parsing function with validation
function safeParseJSON<T>(jsonString: string, schema: z.ZodSchema<T>, fallback: T): T {
  try {
    const parsed = JSON.parse(jsonString);
    return schema.parse(parsed);
  } catch (error) {
    console.warn(`Failed to parse or validate JSON: ${jsonString}`, error);
    return fallback;
  }
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, pageId, docId }) => {
  const [openApiSpec, setOpenApiSpec] = useState<OpenApiSpec | null>(null);
  const [baseUrl, setBaseUrl] = useState<string>("");

  // Parse frontmatter and extract clean content
  const { content: cleanContent } = parseFrontmatter(content);

  // Fetch OpenAPI spec if docId is provided
  useEffect(() => {
    const fetchSpec = async () => {
      if (!docId) return;

      try {
        const response = await httpService.get<{
          success: boolean;
          data: { rawSpec: OpenApiSpec };
        }>(`/docs/${docId}/openapi`);
        const spec = response.data?.rawSpec || response.data;
        setOpenApiSpec(spec);
        setBaseUrl(spec?.servers?.[0]?.url || "");
      } catch (error) {
        console.error("Failed to fetch OpenAPI spec:", error);
      }
    };

    fetchSpec();
  }, [docId]);
  // Parse the markdown content and render operation blocks
  const parseContent = (markdown: string) => {
    // Use clean content without frontmatter
    markdown = cleanContent;
    const parts = [];
    let lastIndex = 0;

    // Find all operation blocks
    const operationRegex = /:::operation\n([\s\S]*?):::/g;
    const operationRefRegex = /:::operation-ref\n([\s\S]*?):::/g;
    const openApiOperationRegex = /:::openapi-operation\n([\s\S]*?):::/g;

    let match;
    const allMatches: Array<{
      type: "operation" | "operation-ref" | "openapi-operation";
      match: RegExpExecArray;
      content: string;
    }> = [];

    // Find operation blocks
    while ((match = operationRegex.exec(markdown)) !== null) {
      allMatches.push({ type: "operation", match, content: match[1] });
    }

    // Find operation references
    while ((match = operationRefRegex.exec(markdown)) !== null) {
      allMatches.push({ type: "operation-ref", match, content: match[1] });
    }

    // Find OpenAPI operation blocks
    while ((match = openApiOperationRegex.exec(markdown)) !== null) {
      allMatches.push({ type: "openapi-operation", match, content: match[1] });
    }

    // Sort matches by position
    allMatches.sort((a, b) => a.match.index - b.match.index);

    // Process matches
    allMatches.forEach((item, index) => {
      const { type, match: regexMatch, content: operationContent } = item;

      // Add text before this match
      if (regexMatch.index > lastIndex) {
        const textContent = markdown.substring(lastIndex, regexMatch.index);
        if (textContent.trim()) {
          parts.push(<div key={`text-${index}`}>{renderMarkdown(textContent)}</div>);
        }
      }

      // Legacy inline operation blocks (:::operation) removed - use :::operation-ref instead

      if (type === "openapi-operation") {
        // Parse OpenAPI operation parameters
        const methodMatch = operationContent.match(/method:\s*(.+)/);
        const endpointMatch = operationContent.match(/endpoint:\s*(.+)/);
        const titleMatch = operationContent.match(/title:\s*(.+)/);
        const operationIdMatch = operationContent.match(/operationId:\s*(.+)/);
        const summaryMatch = operationContent.match(/summary:\s*(.+)/);
        const descriptionMatch = operationContent.match(/description:\s*(.+)/);
        const tagsMatch = operationContent.match(/tags:\s*(.+)/);
        const deprecatedMatch = operationContent.match(/deprecated:\s*(.+)/);
        const parametersMatch = operationContent.match(/parameters:\s*(\[[\s\S]*?\])/);
        const responsesMatch = operationContent.match(/responses:\s*(\{[\s\S]*?\})/);
        const securityMatch = operationContent.match(/security:\s*(\[[\s\S]*?\])/);

        const method = methodMatch?.[1]?.trim() || "GET";
        const endpoint = endpointMatch?.[1]?.trim() || "";
        const title = titleMatch?.[1]?.trim() || "";
        const operationId_openapi = operationIdMatch?.[1]?.trim() || "";
        const summary = summaryMatch?.[1]?.trim() || "";
        const description = descriptionMatch?.[1]?.trim() || "";
        const tags =
          tagsMatch?.[1]
            ?.trim()
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean) || [];
        const deprecated = deprecatedMatch?.[1]?.trim() === "true";

        let parameters: z.infer<typeof ParameterSchema>[] = [];
        let responses: z.infer<typeof ResponseSchema> = {};
        let security: z.infer<typeof SecuritySchema> = [];

        // Safe JSON parsing with Zod validation
        if (parametersMatch) {
          parameters = safeParseJSON(parametersMatch[1], z.array(ParameterSchema), []);
        }

        if (responsesMatch) {
          responses = safeParseJSON(responsesMatch[1], ResponseSchema, {});
        }

        if (securityMatch) {
          security = safeParseJSON(securityMatch[1], SecuritySchema, []);
        }

        parts.push(
          <OpenApiOperationBlock
            key={`openapi-operation-${index}`}
            method={method}
            endpoint={endpoint}
            title={title}
            operationId_openapi={operationId_openapi}
            summary={summary}
            description={description}
            tags={tags}
            deprecated={deprecated}
            parameters={parameters}
            responses={responses}
            security={security}
            pageId={pageId}
            embedded={true}
          />
        );
      } else if (type === "operation-ref") {
        // Parse operation reference
        const idMatch = operationContent.match(/id:\s*(.+)/);
        if (idMatch && openApiSpec) {
          const operationId = idMatch[1].trim();
          parts.push(
            <EmbeddedOperationViewer
              key={`operation-ref-${index}`}
              operationId={operationId}
              spec={openApiSpec}
              baseUrl={baseUrl}
            />
          );
        } else if (idMatch && !openApiSpec) {
          // Show loading state if spec is not loaded yet
          parts.push(
            <div
              key={`operation-ref-${index}`}
              className="my-4 p-4 border border-gray-200 dark:border-gray-700 rounded"
            >
              <p className="text-gray-500">Loading API operation...</p>
            </div>
          );
        }
      }

      lastIndex = regexMatch.index + regexMatch[0].length;
    });

    // Add remaining text
    if (lastIndex < markdown.length) {
      const textContent = markdown.substring(lastIndex);
      if (textContent.trim()) {
        parts.push(<div key="text-end">{renderMarkdown(textContent)}</div>);
      }
    }

    return parts.length > 0 ? parts : [<div key="full-content">{renderMarkdown(markdown)}</div>];
  };

  // Render markdown using react-markdown
  const renderMarkdown = (markdown: string) => {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          h1: ({ ...props }) => (
            <h1
              className="text-2xl font-bold mt-8 mb-6 text-gray-900 dark:text-gray-100"
              {...props}
            />
          ),
          h2: ({ ...props }) => (
            <h2
              className="text-xl font-semibold mt-8 mb-4 text-gray-900 dark:text-gray-100"
              {...props}
            />
          ),
          h3: ({ ...props }) => (
            <h3
              className="text-lg font-semibold mt-6 mb-3 text-gray-900 dark:text-gray-100"
              {...props}
            />
          ),
          p: ({ ...props }) => <p className="mb-4 text-gray-800 dark:text-gray-200" {...props} />,
          code: ({
            inline,
            className,
            children,
            ...props
          }: {
            inline?: boolean;
            className?: string;
            children?: React.ReactNode;
          }) => {
            if (inline) {
              return (
                <code
                  className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5  text-sm font-mono"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code className={`${className || ""} text-sm font-mono`} {...props}>
                {children}
              </code>
            );
          },
          pre: ({ children, ...props }: { children?: React.ReactNode }) => {
            const extractTextFromChildren = (children: React.ReactNode): string => {
              if (typeof children === "string") return children;
              if (Array.isArray(children)) return children.map(extractTextFromChildren).join("");
              if (children && typeof children === "object" && "props" in children) {
                const child: JSX.Element = children;
                if (child.props && child.props.children) {
                  return extractTextFromChildren(child.props.children);
                }
              }
              return "";
            };

            const codeText = extractTextFromChildren(children);

            return (
              <div className="relative group">
                <CopyButton text={codeText} />
                <pre
                  className="bg-gray-900 text-gray-100 rounded-xl overflow-x-auto my-4 border border-gray-700"
                  {...props}
                >
                  {children}
                </pre>
              </div>
            );
          },
          a: ({ ...props }) => (
            <a
              className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300"
              {...props}
            />
          ),
          ul: ({ ...props }) => <ul className="list-disc ml-6 mb-4" {...props} />,
          ol: ({ ...props }) => <ol className="list-decimal ml-6 mb-4" {...props} />,
          li: ({ ...props }) => <li className="mb-1" {...props} />,
          blockquote: ({ ...props }) => (
            <blockquote
              className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-4 italic text-gray-700 dark:text-gray-300"
              {...props}
            />
          ),
          img: ({ ...props }) => (
            <img className="max-w-full h-auto my-4 rounded border" {...props} />
          ),
          table: ({ ...props }) => (
            <div className="overflow-x-auto my-4">
              <table
                className="min-w-full divide-y divide-gray-200 dark:divide-gray-700"
                {...props}
              />
            </div>
          ),
          th: ({ ...props }) => (
            <th
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 font-semibold text-left"
              {...props}
            />
          ),
          td: ({ ...props }) => (
            <td className="px-4 py-2 border-t border-gray-200 dark:border-gray-700" {...props} />
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    );
  };

  const renderedContent = parseContent(content);

  return <div className="space-y-4">{renderedContent}</div>;
};

export default MarkdownRenderer;
