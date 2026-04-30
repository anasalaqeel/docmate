import React, { useState, useEffect, type JSX, memo } from "react";
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
    const frontmatterText = match[1];
    const markdownContent = match[2];
    const frontmatter: Record<string, any> = {};

    const lines = frontmatterText.split('\n');
    for (const line of lines) {
      const keyValueMatch = line.match(/^\s*(.+?):\s*(.+?)\s*$/);
      if (keyValueMatch) {
        const [, key, value] = keyValueMatch;
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

  // Parse frontmatter once
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

  // Render markdown using react-markdown
  const renderMarkdown = (text: string) => {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          p: (props: React.ComponentPropsWithoutRef<'p'>) => <p className="mb-4 leading-relaxed text-gray-800 dark:text-gray-200" {...props} />,
          h1: (props: React.ComponentPropsWithoutRef<'h1'>) => <h1 className="text-3xl font-bold mb-6 mt-8 border-b pb-2 text-gray-900 dark:text-gray-100" {...props} />,
          h2: (props: React.ComponentPropsWithoutRef<'h2'>) => <h2 className="text-2xl font-bold mb-4 mt-6 border-b pb-1 text-gray-900 dark:text-gray-100" {...props} />,
          h3: (props: React.ComponentPropsWithoutRef<'h3'>) => <h3 className="text-xl font-bold mb-3 mt-4 text-gray-900 dark:text-gray-100" {...props} />,
          ul: (props: React.ComponentPropsWithoutRef<'ul'>) => <ul className="list-disc list-inside mb-4 space-y-2" {...props} />,
          ol: (props: React.ComponentPropsWithoutRef<'ol'>) => <ol className="list-decimal list-inside mb-4 space-y-2" {...props} />,
          li: (props: React.ComponentPropsWithoutRef<'li'>) => <li className="ml-4" {...props} />,
          blockquote: (props: React.ComponentPropsWithoutRef<'blockquote'>) => (
            <blockquote className="border-l-4 border-primary-500 pl-4 py-2 my-4 italic bg-gray-50 dark:bg-gray-800/50 rounded-r-lg" {...props} />
          ),
          table: (props: React.ComponentPropsWithoutRef<'table'>) => (
            <div className="overflow-x-auto my-6 border rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" {...props} />
            </div>
          ),
          thead: (props: React.ComponentPropsWithoutRef<'thead'>) => <thead className="bg-gray-50 dark:bg-gray-800" {...props} />,
          th: (props: React.ComponentPropsWithoutRef<'th'>) => <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" {...props} />,
          td: (props: React.ComponentPropsWithoutRef<'td'>) => <td className="px-4 py-2 whitespace-nowrap text-sm border-t border-gray-100 dark:border-gray-800" {...props} />,
          a: ({ ...props }: React.ComponentPropsWithoutRef<'a'>) => {
            const isExternal = props.href?.startsWith("http");
            return (
              <a
                className="text-primary-600 hover:text-primary-500 underline transition-colors font-medium"
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                {...props}
              />
            );
          },
          img: (props: React.ComponentPropsWithoutRef<'img'>) => (
            <img className="max-w-full h-auto rounded-lg shadow-md my-6 mx-auto block" {...props} />
          ),
          code: ({
            inline,
            className,
            children,
            ...props
          }: any) => {
            const isBlock = className?.includes("language-") || className?.includes("hljs");
            
            if (!isBlock) {
              return (
                <code
                  className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono text-primary-600 dark:text-primary-400"
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
          pre: ({ children, ...props }: React.ComponentPropsWithoutRef<'pre'>) => {
            const extractTextFromChildren = (children: React.ReactNode): string => {
              if (typeof children === "string") return children;
              if (Array.isArray(children)) return children.map(extractTextFromChildren).join("");
              if (children && typeof children === "object" && "props" in children) {
                const child = children as { props: { children?: React.ReactNode } };
                if (child.props && child.props.children) {
                  return extractTextFromChildren(child.props.children);
                }
              }
              return "";
            };

            const codeText = extractTextFromChildren(children);

            return (
              <div className="relative group my-6">
                <CopyButton text={codeText} />
                <pre
                  className={`bg-gray-900 text-gray-100 rounded-xl overflow-x-auto p-4 border border-gray-700 shadow-lg ${props.className || ""}`}
                  {...props}
                >
                  {children}
                </pre>
              </div>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
    );
  };

  // Parse the markdown content and render operation blocks
  const parseContent = (text: string) => {
    const parts: JSX.Element[] = [];
    let lastIndex = 0;

    const operationRegex = /:::operation\s*\r?\n([\s\S]*?):::/g;
    const operationRefRegex = /:::operation-ref\s*\r?\n([\s\S]*?):::/g;
    const openApiOperationRegex = /:::openapi-operation\s*\r?\n([\s\S]*?):::/g;

    const allMatches: Array<{
      type: "operation" | "operation-ref" | "openapi-operation";
      match: RegExpExecArray;
      content: string;
    }> = [];

    const allRegexes = [
      { type: "operation" as const, regex: operationRegex },
      { type: "operation-ref" as const, regex: operationRefRegex },
      { type: "openapi-operation" as const, regex: openApiOperationRegex },
    ];

    allRegexes.forEach(({ type, regex }) => {
      let match;
      regex.lastIndex = 0;
      while ((match = regex.exec(text)) !== null) {
        allMatches.push({
          type,
          match,
          content: match[1],
        });
      }
    });

    allMatches.sort((a, b) => a.match.index - b.match.index);

    allMatches.forEach((item, index) => {
      const { type, match: regexMatch, content: operationContent } = item;

      if (regexMatch.index < lastIndex) return;

      if (regexMatch.index > lastIndex) {
        const textContent = text.substring(lastIndex, regexMatch.index);
        if (textContent.trim()) {
          parts.push(<div key={`text-${index}`}>{renderMarkdown(textContent)}</div>);
        }
      }

      if (type === "operation") {
        const methodMatch = operationContent.match(/method:\s*(.+)/);
        const endpointMatch = operationContent.match(/endpoint:\s*(.+)/);
        const titleMatch = operationContent.match(/title:\s*(.+)/);

        const method = methodMatch?.[1]?.trim() || "GET";
        const endpoint = endpointMatch?.[1]?.trim() || "";
        const title = titleMatch?.[1]?.trim() || "";

        parts.push(
          <OpenApiOperationBlock
            key={`operation-${index}`}
            method={method}
            endpoint={endpoint}
            title={title}
            pageId={pageId}
            embedded={true}
          />
        );
      } else if (type === "openapi-operation") {
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
        const tags = tagsMatch?.[1]?.trim().split(",").map((tag) => tag.trim()).filter(Boolean) || [];
        const deprecated = deprecatedMatch?.[1]?.trim() === "true";

        let parameters = parametersMatch ? safeParseJSON(parametersMatch[1], z.array(ParameterSchema), []) : [];
        let responses = responsesMatch ? safeParseJSON(responsesMatch[1], ResponseSchema, {}) : {};
        let security = securityMatch ? safeParseJSON(securityMatch[1], SecuritySchema, []) : [];

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
        } else if (idMatch) {
          parts.push(
            <div key={`operation-ref-${index}`} className="my-4 p-4 border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800">
              <p className="text-gray-500 animate-pulse">Loading API operation...</p>
            </div>
          );
        }
      }

      lastIndex = regexMatch.index + regexMatch[0].length;
    });

    if (lastIndex < text.length) {
      const textContent = text.substring(lastIndex);
      if (textContent.trim()) {
        parts.push(<div key="text-end">{renderMarkdown(textContent)}</div>);
      }
    }

    return parts.length > 0 ? parts : [<div key="full-content">{renderMarkdown(text)}</div>];
  };

  const renderedContent = parseContent(cleanContent);

  return <div className="markdown-renderer space-y-4">{renderedContent}</div>;
};

export default memo(MarkdownRenderer);
