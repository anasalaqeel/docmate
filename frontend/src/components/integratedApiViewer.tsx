import { useState, useEffect, useCallback } from "react";
import { Chip, Button, Input, Code, Tabs, Tab, Breadcrumbs, BreadcrumbItem } from "@heroui/react";
import EnhancedCodeEditor from './ui/enhancedCodeEditor';
import type { OpenApiSpec, Documentation, OpenApiOperation, JsonSchema } from "../types/docs";
import { getPublicOpenApiSpec } from "../services/docsService";
import styles from "../styles/integratedApiViewer.module.css";

interface IntegratedApiViewerProps {
  documentation: Documentation;
  selectedEndpoint: string | null;
}

interface OperationItem {
  id: string;
  method: string;
  path: string;
  summary: string;
  operation: OpenApiOperation;
  tag?: string;
}

interface TestRequest {
  pathParams?: Record<string, string>;
  queryParams?: Record<string, string>;
  headers?: Record<string, string>;
  body?: string;
}

interface TestResponse {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  data?: unknown;
  url?: string;
  error?: string;
}

const IntegratedApiViewer = ({ documentation, selectedEndpoint }: IntegratedApiViewerProps) => {
  const [spec, setSpec] = useState<OpenApiSpec | null>(null);
  const [loading, setLoading] = useState(true);
  const [operations, setOperations] = useState<OperationItem[]>([]);
  const [testRequest, setTestRequest] = useState<TestRequest>({});
  const [testResponse, setTestResponse] = useState<TestResponse | null>(null);
  const [isTestLoading, setIsTestLoading] = useState(false);

  const parseOperations = useCallback((spec: OpenApiSpec) => {
    const ops: OperationItem[] = [];

    if (spec.paths) {
      Object.entries(spec.paths).forEach(([path, pathItem]) => {
        Object.entries(pathItem).forEach(([method, operation]) => {
          const tag = operation.tags?.[0] || "General";
          ops.push({
            id: `${method}-${path}`,
            method: method.toUpperCase(),
            path,
            summary: operation.summary || `${method.toUpperCase()} ${path}`,
            operation,
            tag,
          });
        });
      });
    }

    setOperations(ops);
  }, []);

  const fetchOpenApiSpec = useCallback(async () => {
    if (!documentation.id) return;

    try {
      setLoading(true);
      const result = await getPublicOpenApiSpec(documentation.id);
      if (result.success && result.data) {
        setSpec(result.data);
        parseOperations(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch OpenAPI spec:", error);
    } finally {
      setLoading(false);
    }
  }, [documentation.id, parseOperations]);

  useEffect(() => {
    fetchOpenApiSpec();
  }, [fetchOpenApiSpec]);

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case "GET":
        return "success";
      case "POST":
        return "primary";
      case "PUT":
        return "warning";
      case "PATCH":
        return "secondary";
      case "DELETE":
        return "danger";
      default:
        return "default";
    }
  };

  const selectedOperation = operations.find((op) => op.id === selectedEndpoint);

  const renderParametersTable = (parameters: OpenApiOperation['parameters']) => {
    if (!parameters || parameters.length === 0) return null;

    return (
      <div className={styles.parametersTable}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>In</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {parameters.map((param, index) => (
              <tr key={index}>
                <td>
                  <div className={styles.paramName}>
                    <code>{param.name}</code>
                    {param.required && <span className={styles.required}>*</span>}
                  </div>
                </td>
                <td>
                  <code className={styles.paramType}>{param.schema?.type || param.type || "string"}</code>
                </td>
                <td>
                  <span className={styles.paramIn}>{param.in}</span>
                </td>
                <td>{param.description || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderJsonSchema = (schema: JsonSchema): React.ReactNode => {
    if (!schema) return null;

    if (schema.type === "object" && schema.properties) {
      return (
        <div className={styles.schemaObject}>
          <div className={styles.schemaContent}>
            {Object.entries(schema.properties).map(([propName, propSchema]: [string, JsonSchema]) => (
              <div key={propName} className={styles.schemaProperty}>
                <div className={styles.propertyLine}>
                  <span className={styles.propertyName}>"{propName}"</span>
                  <span className={styles.propertyColon}>:</span>
                  <span className={styles.propertyType}>
                    {propSchema.type || "any"}
                    {schema.required?.includes(propName) && <span className={styles.required}>*</span>}
                  </span>
                </div>
                {propSchema.description && <div className={styles.propertyDescription}>// {propSchema.description}</div>}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className={styles.schemaSimple}>
        <code>{schema.type || "any"}</code>
        {schema.description && <span className={styles.schemaDescription}> // {schema.description}</span>}
      </div>
    );
  };

  const executeRequest = async () => {
    if (!selectedOperation) return;

    setIsTestLoading(true);
    try {
      const baseUrl = spec?.servers?.[0]?.url || documentation.baseUrl || "";
      let url = baseUrl + selectedOperation.path;

      // Replace path parameters
      Object.entries(testRequest.pathParams || {}).forEach(([key, value]) => {
        url = url.replace(`{${key}}`, encodeURIComponent(value as string));
      });

      // Add query parameters
      const queryParams = new URLSearchParams(testRequest.queryParams || {});
      if (queryParams.toString()) {
        url += "?" + queryParams.toString();
      }

      const options: RequestInit = {
        method: selectedOperation.method,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...testRequest.headers,
        },
      };

      if (["POST", "PUT", "PATCH"].includes(selectedOperation.method) && testRequest.body) {
        options.body = testRequest.body;
      }

      const response = await fetch(url, options);
      const responseText = await response.text();

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      setTestResponse({
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData,
        url,
      });
    } catch (error) {
      setTestResponse({
        error: error instanceof Error ? error.message : "Request failed",
      });
    } finally {
      setIsTestLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <p>Loading API specification...</p>
      </div>
    );
  }

  if (!selectedOperation) {
    return (
      <div className={styles.noSelection}>
        <h2>API Documentation</h2>
        <p>Select an API endpoint from the sidebar to view its details.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <Breadcrumbs>
          <BreadcrumbItem>{documentation.title}</BreadcrumbItem>
          <BreadcrumbItem>API</BreadcrumbItem>
          <BreadcrumbItem>{selectedOperation.summary}</BreadcrumbItem>
        </Breadcrumbs>

        <div className={styles.operationTitle}>
          <Chip color={getMethodColor(selectedOperation.method) as "default" | "primary" | "secondary" | "success" | "warning" | "danger"} size="lg" variant="flat" className={styles.methodChip}>
            {selectedOperation.method}
          </Chip>
          <div className={styles.titleInfo}>
            <h1 className={styles.title}>{selectedOperation.summary}</h1>
            <code className={styles.path}>{selectedOperation.path}</code>
          </div>
        </div>

        {selectedOperation.operation.description && <p className={styles.description}>{selectedOperation.operation.description}</p>}
      </div>

      {/* Content */}
      <div className={styles.content}>
        <Tabs
          classNames={{
            base: styles.tabs,
            cursor: styles.tabCursor,
            tabContent: "group-data-[selected=true]:text-[var(--grud-text)]",
            tab: styles.tab,
          }}
          variant="bordered"
        >
          <Tab key="overview" title="Overview">
            <div className={styles.tabContentWrapper}>
              {/* Parameters */}
              {selectedOperation.operation.parameters && selectedOperation.operation.parameters.length > 0 && (
                <section className={styles.section}>
                  <h3>Parameters</h3>
                  {renderParametersTable(selectedOperation.operation.parameters)}
                </section>
              )}

              {/* Request Body */}
              {selectedOperation.operation.requestBody && (
                <section className={styles.section}>
                  <h3>Request Body</h3>
                  <div className={styles.requestBodySection}>
                    {selectedOperation.operation.requestBody.description && (
                      <p className={styles.sectionDescription}>{selectedOperation.operation.requestBody.description}</p>
                    )}
                    {selectedOperation.operation.requestBody.content && (
                      <div className={styles.contentTypes}>
                        {Object.entries(selectedOperation.operation.requestBody.content).map(([contentType, content]) => (
                          <div key={contentType} className={styles.contentType}>
                            <h4>
                              Content-Type: <code>{contentType}</code>
                            </h4>
                            {content.schema && renderJsonSchema(content.schema)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Responses */}
              {selectedOperation.operation.responses && (
                <section className={styles.section}>
                  <h3>Responses</h3>
                  <div className={styles.responsesSection}>
                    {Object.entries(selectedOperation.operation.responses).map(([status, response]) => (
                      <div key={status} className={styles.responseItem}>
                        <div className={styles.responseHeader}>
                          <Chip size="sm" color={status.startsWith("2") ? "success" : status.startsWith("4") ? "warning" : "danger"} variant="flat">
                            {status}
                          </Chip>
                          <span className={styles.responseDescription}>{response.description || "No description"}</span>
                        </div>
                        {response.content && (
                          <div className={styles.responseContent}>
                            {Object.entries(response.content).map(([contentType, content]) => (
                              <div key={contentType} className={styles.responseContentType}>
                                <h5>
                                  Content-Type: <code>{contentType}</code>
                                </h5>
                                {content.schema && renderJsonSchema(content.schema)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </Tab>

          <Tab key="try-it" title="Try It">
            <div className={styles.tabContent}>
              <div className={styles.tryItSection}>
                <div className={styles.tryItForm}>
                  <h3>Request</h3>

                  {/* Path Parameters */}
                  {(selectedOperation.operation.parameters?.filter((p) => p.in === "path").length ?? 0) > 0 && (
                    <div className={styles.formSection}>
                      <h4>Path Parameters</h4>
                      {selectedOperation.operation.parameters
                        ?.filter((p) => p.in === "path")
                        .map((param) => (
                          <Input
                            key={param.name}
                            label={param.name}
                            placeholder={param.description}
                            isRequired={param.required}
                            onChange={(e) =>
                              setTestRequest((prev) => ({
                                ...prev,
                                pathParams: { ...prev.pathParams, [param.name]: e.target.value },
                              }))
                            }
                          />
                        ))}
                    </div>
                  )}

                  {/* Query Parameters */}
                  {(selectedOperation.operation.parameters?.filter((p) => p.in === "query").length ?? 0) > 0 && (
                    <div className={styles.formSection}>
                      <h4>Query Parameters</h4>
                      {selectedOperation.operation.parameters
                        ?.filter((p) => p.in === "query")
                        .map((param) => (
                          <Input
                            key={param.name}
                            label={param.name}
                            placeholder={param.description}
                            isRequired={param.required}
                            onChange={(e) =>
                              setTestRequest((prev) => ({
                                ...prev,
                                queryParams: { ...prev.queryParams, [param.name]: e.target.value },
                              }))
                            }
                          />
                        ))}
                    </div>
                  )}

                  {/* Request Body */}
                  {["POST", "PUT", "PATCH"].includes(selectedOperation.method) && (
                    <div className={styles.formSection}>
                      <h4>Request Body</h4>
                      <EnhancedCodeEditor
                        placeholder="Enter JSON request body"
                        value={testRequest.body || '{}'}
                        onChange={(value) => setTestRequest((prev) => ({ ...prev, body: value }))}
                        language="json"
                        height={200}
                        title="Request Body"
                        className={styles.requestBodyInput}
                      />
                    </div>
                  )}

                  <Button color="primary" size="lg" onPress={executeRequest} isLoading={isTestLoading} className={styles.sendButton}>
                    Send Request
                  </Button>
                </div>

                {/* Response Section */}
                {testResponse && (
                  <div className={styles.responseSection}>
                    <h3>Response</h3>
                    {testResponse.error ? (
                      <div className={styles.errorResponse}>
                        <h4>Error</h4>
                        <Code color="danger">{testResponse.error}</Code>
                      </div>
                    ) : (
                      <>
                        <div className={styles.responseStatus}>
                          <Chip color={testResponse.status! < 400 ? "success" : "danger"} variant="flat">
                            {testResponse.status} {testResponse.statusText}
                          </Chip>
                        </div>
                        <div className={styles.responseBody}>
                          <h4>Response Body</h4>
                          <EnhancedCodeEditor
                            value={typeof testResponse.data === "object" ? JSON.stringify(testResponse.data, null, 2) : String(testResponse.data ?? '')}
                            readOnly
                            language={typeof testResponse.data === "object" ? "json" : "plaintext"}
                            height={250}
                            allowCopy
                            title="Response Body"
                            className={styles.responseCode}
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Tab>
        </Tabs>
      </div>
    </div>
  );
};

export default IntegratedApiViewer;
