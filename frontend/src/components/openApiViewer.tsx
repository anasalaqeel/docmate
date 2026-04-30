import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Tabs,
  Tab,
  Button,
  Chip,
  Badge,
  Accordion,
  AccordionItem,
  Code,
  Divider,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";
import { load } from 'js-yaml';
import EnhancedCodeEditor from "./ui/enhancedCodeEditor";
import { PlayIcon, DocumentArrowDownIcon, DocumentArrowUpIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { OpenApiSpec, Documentation, OpenApiOperation } from "../types/docs";
import { getOpenApiSpec, importOpenApiSpec, exportOpenApiSpec, deleteOpenApiSpec } from "../services/docsService";
import styles from "../styles/openApiViewer.module.css";
import { performApiTest } from "../utils/proxyRequest";

interface OpenApiViewerProps {
  documentation: Documentation;
  onSpecUpdate?: () => void;
}

interface SelectedOperation {
  path: string;
  method: string;
  operation: OpenApiOperation;
}

interface TestResult {
  status?: number;
  statusText?: string;
  data?: unknown;
  error?: string;
}

const OpenApiViewer = ({ documentation, onSpecUpdate }: OpenApiViewerProps) => {
  const [spec, setSpec] = useState<OpenApiSpec | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOperation, setSelectedOperation] = useState<SelectedOperation | null>(null);
  const [testData, setTestData] = useState<Record<string, unknown>>({});
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const [isImportOpen, setIsImportOpen] = useState(false);
  const { isOpen: isTestOpen, onOpen: onTestOpen, onClose: onTestClose } = useDisclosure();

  const [importData, setImportData] = useState("");
  const [importError, setImportError] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchOpenApiSpec = useCallback(async () => {
    if (!documentation.id) {
      console.error("Documentation ID is required");
      return;
    }

    try {
      setLoading(true);
      const result = await getOpenApiSpec(documentation.id);
      if (result.success && result.data) {
        setSpec(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch OpenAPI spec:", error);
    } finally {
      setLoading(false);
    }
  }, [documentation.id]);

  useEffect(() => {
    fetchOpenApiSpec();
  }, [fetchOpenApiSpec]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImportError("");

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setImportData(content);
      };
      reader.onerror = () => {
        setImportError("Failed to read file");
      };
      reader.readAsText(file);
    }
  };

  const importSpec = async () => {
    if (!importData.trim()) {
      setImportError("Please provide an OpenAPI specification");
      return;
    }

    if (!documentation.id) {
      setImportError("Documentation ID is required");
      return;
    }

    try {
      setImportLoading(true);
      setImportError("");

      let parsedSpec: Record<string, unknown>;

      // Try JSON first, then YAML
      try {
        parsedSpec = JSON.parse(importData);
      } catch {
        // If JSON fails, try YAML
        try {
          const yamlResult = load(importData);
          if (typeof yamlResult === 'object' && yamlResult !== null) {
            parsedSpec = yamlResult as Record<string, unknown>;
          } else {
            throw new Error("Invalid YAML: result is not an object");
          }
        } catch (yamlError) {
          const errorMessage = yamlError instanceof Error ? yamlError.message : "Invalid YAML format";
          throw new Error(`Failed to parse specification: ${errorMessage}`);
        }
      }

      const result = await importOpenApiSpec(documentation.id, parsedSpec);

      if (result.success) {
        await fetchOpenApiSpec();
        onSpecUpdate?.();
        setIsImportOpen(false);
        setImportData("");
        setImportError("");
        setSelectedFile(null);
      } else {
        setImportError("Failed to import specification. Please check the format.");
      }
    } catch (error) {
      console.error("Failed to import OpenAPI spec:", error);
      setImportError(error instanceof Error ? error.message : "Failed to import specification");
    } finally {
      setImportLoading(false);
    }
  };

  const exportSpec = async () => {
    if (!documentation.id) {
      console.error("Documentation ID is required");
      return;
    }

    try {
      const blob = await exportOpenApiSpec(documentation.id);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `openapi-spec-${documentation.id}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Failed to export OpenAPI spec:", error);
    }
  };

  const handleDeleteSpec = async () => {
    if (!documentation.id) {
      console.error("Documentation ID is required");
      return;
    }

    if (!confirm("Are you sure you want to delete this OpenAPI specification? This action cannot be undone.")) {
      return;
    }

    try {
      setDeleteLoading(true);
      const result = await deleteOpenApiSpec(documentation.id);

      if (result.success) {
        await fetchOpenApiSpec();
        onSpecUpdate?.();
      } else {
        console.error("Failed to delete OpenAPI spec");
      }
    } catch (error) {
      console.error("Failed to delete OpenAPI spec:", error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const testOperation = async () => {
    if (!selectedOperation || !documentation.baseUrl) return;

    try {
      // Build the request URL
      let url = documentation.baseUrl + selectedOperation.path;

      // Replace path parameters
      const pathParams = testData.pathParams;
      if (pathParams && typeof pathParams === 'object') {
        Object.entries(pathParams).forEach(([key, value]) => {
          url = url.replace(`{${key}}`, String(value));
        });
      }

      // Add query parameters
      const queryParams = testData.queryParams;
      if (queryParams && typeof queryParams === 'object') {
        const params = new URLSearchParams(queryParams as Record<string, string>);
        if (params.toString()) {
          url += "?" + params.toString();
        }
      }

      const response = await performApiTest(
        url,
        selectedOperation.method,
        (testData.headers && typeof testData.headers === 'object' ? testData.headers as Record<string, string> : {}),
        testData.body
      );

      setTestResult({
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        error: response.error
      });
    } catch (error) {
      setTestResult({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

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

  const openTestModal = (path: string, method: string, operation: OpenApiOperation) => {
    setSelectedOperation({ path, method, operation });
    setTestData({});
    setTestResult(null);
    onTestOpen();
  };

  const renderContent = () => {
    if (loading) {
      return <div className={styles.loading}>Loading OpenAPI specification...</div>;
    }

    if (!spec && documentation.type !== "traditional") {
      return (
        <div className={styles.noSpec}>
          <Card className={styles.emptyCard}>
            <CardBody className="text-center p-8">
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--grud-text)' }}>No OpenAPI Specification</h3>
              <p className="mb-6" style={{ color: 'var(--grud-text-secondary)' }}>Import an OpenAPI specification to document your API.</p>
              <div className="flex gap-4 justify-center">
                <Button
                  onPress={() => setIsImportOpen(true)}
                  className={styles.buttonGradient}
                  startContent={<DocumentArrowUpIcon className="w-4 h-4" />}
                >
                  Import Specification
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      );
    }

    if (!spec) {
      return null; // Hide for traditional docs
    }

    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <h2>{typeof spec.info.title === 'string' ? spec.info.title : 'API Documentation'}</h2>
            {typeof spec.info.description === 'string' && <p>{spec.info.description}</p>}
            <div className={styles.headerMeta}>
              <Chip size="sm" style={{ background: 'var(--grud-primary)', color: 'white' }}>
                v{typeof spec.info.version === 'string' ? spec.info.version : '1.0.0'}
              </Chip>
              <Chip size="sm" variant="bordered" style={{ color: 'var(--grud-text-secondary)', borderColor: 'var(--grud-border-color)' }}>
                OpenAPI {typeof spec.specVersion === 'string' ? spec.specVersion : '3.0.0'}
              </Chip>
            </div>
          </div>

          <div className={styles.headerActions}>
            <Button variant="bordered" size="sm" onPress={() => setIsImportOpen(true)} startContent={<DocumentArrowUpIcon className="w-4 h-4" />}>
              Import
            </Button>
            <Button variant="bordered" size="sm" onPress={exportSpec} startContent={<DocumentArrowDownIcon className="w-4 h-4" />}>
              Export
            </Button>
            <Button
              variant="bordered"
              size="sm"
              color="danger"
              onPress={handleDeleteSpec}
              isLoading={deleteLoading}
              startContent={!deleteLoading && <TrashIcon className="w-4 h-4" />}
            >
              Delete
            </Button>
          </div>
        </div>

        <Tabs variant="underlined" className={styles.tabs} classNames={{
          tabList: "border-b border-[var(--grud-border-color)] w-full",
          tabContent: "group-data-[selected=true]:text-[var(--grud-primary)]"
        }}>
          <Tab key="paths" title="API Operations">
            <div className={styles.operations}>
              {spec.paths &&
                Object.entries(spec.paths).map(([path, pathItem]) => (
                  <Card key={path} className={styles.pathCard}>
                    <CardHeader>
                      <h4 className={styles.pathTitle}>{path}</h4>
                    </CardHeader>
                    <CardBody>
                      {Object.entries(pathItem).map(([method, operation]) => (
                        <div key={method} className={styles.operation}>
                          <div className={styles.operationHeader}>
                            <div className={styles.operationMeta}>
                              <Chip color={getMethodColor(method) as "default" | "primary" | "secondary" | "success" | "warning" | "danger"} size="sm" variant="flat">
                                {method.toUpperCase()}
                              </Chip>
                              {typeof operation.summary === 'string' && (
                                <span className={styles.operationSummary}>{operation.summary}</span>
                              )}
                              {operation.tags &&
                                operation.tags.map((tag: string) => (
                                  <Badge key={tag} size="sm" variant="flat">
                                    {tag}
                                  </Badge>
                                ))}
                            </div>

                            {documentation.baseUrl && (
                              <Button
                                size="sm"
                                variant="light"
                                color="primary"
                                startContent={<PlayIcon className="w-4 h-4" />}
                                onPress={() => openTestModal(path, method, operation)}
                              >
                                Test
                              </Button>
                            )}
                          </div>

                          {typeof operation.description === 'string' && (
                            <p className={styles.operationDescription}>{operation.description}</p>
                          )}

                          <Accordion className={styles.operationDetails}>
                            {operation.parameters && operation.parameters.length > 0 ? (
                              <AccordionItem key="parameters" title="Parameters" classNames={{ base: styles.accordion }}>
                                <div className={styles.parameters}>
                                  {operation.parameters.map((param, index: number) => (
                                    <div key={index} className={styles.parameter}>
                                      <Code>{typeof param.name === 'string' ? param.name : String(param.name || '')}</Code>
                                      <span className={styles.paramType}>{typeof param.in === 'string' ? param.in : String(param.in || '')}</span>
                                      {param.required && (
                                        <Chip size="sm" color="danger" variant="flat">
                                          Required
                                        </Chip>
                                      )}
                                      {typeof param.description === 'string' && <span>{param.description}</span>}
                                    </div>
                                  ))}
                                </div>
                              </AccordionItem>
                            ) : null}

                            {operation.requestBody ? (
                              <AccordionItem key="request" title="Request Body" classNames={{ base: styles.accordion }}>
                                <EnhancedCodeEditor
                                  value={JSON.stringify(operation.requestBody, null, 2)}
                                  readOnly
                                  language="json"
                                  height={200}
                                  allowCopy
                                  title="Request Body Schema"
                                />
                              </AccordionItem>
                            ) : null}

                            {operation.responses ? (
                              <AccordionItem key="responses" title="Responses" classNames={{ base: styles.accordion }}>
                                <div className={styles.responses}>
                                  {Object.entries(operation.responses).map(([status, response]) => (
                                    <div key={status} className={styles.response}>
                                      <div className={styles.responseHeader}>
                                        <Chip size="sm" color={status.startsWith("2") ? "success" : "danger"}>
                                          {status}
                                        </Chip>
                                        {typeof response.description === 'string' && <span>{response.description}</span>}
                                      </div>
                                      {response.content && (
                                        <EnhancedCodeEditor
                                          value={JSON.stringify(response.content, null, 2)}
                                          readOnly
                                          language="json"
                                          height={150}
                                          allowCopy
                                          collapsible
                                          title={`Response ${status} Schema`}
                                        />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </AccordionItem>
                            ) : null}
                          </Accordion>
                        </div>
                      ))}
                    </CardBody>
                  </Card>
                ))}
            </div>
          </Tab>

          <Tab key="schemas" title="Schemas">
            {spec.components?.schemas && (
              <div className={styles.schemas}>
                {Object.entries(spec.components.schemas).map(([name, schema]) => (
                  <Card key={name} className={styles.schemaCard}>
                    <CardHeader>
                      <h4>{name}</h4>
                    </CardHeader>
                    <CardBody>
                      <EnhancedCodeEditor
                        value={JSON.stringify(schema, null, 2)}
                        readOnly
                        language="json"
                        height={300}
                        allowCopy
                        collapsible
                        title={`${name} Schema`}
                      />
                    </CardBody>
                  </Card>
                ))}
              </div>
            )}
          </Tab>

          <Tab key="servers" title="Servers">
            {spec.servers && spec.servers.length > 0 && (
              <div className={styles.servers}>
                {spec.servers.map((server, index) => (
                  <Card key={index} className={styles.serverCard}>
                    <CardBody>
                      <Code>{server.url}</Code>
                      {server.description && <p>{server.description}</p>}
                    </CardBody>
                  </Card>
                ))}
              </div>
            )}
          </Tab>
        </Tabs>
      </div>
    );
  };

  return (
    <>
      {renderContent()}

      {/* Import Modal */}
      <Modal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} size="3xl" classNames={{
        base: "bg-[var(--grud-surface)] border border-[var(--grud-border-color)]",
        header: "border-b border-[var(--grud-border-color)] text-[var(--grud-text)]",
        footer: "border-t border-[var(--grud-border-color)]",
        closeButton: "hover:bg-[var(--grud-surface-alt)]"
      }}>
        <ModalContent>
          <ModalHeader>Import OpenAPI Specification</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--grud-text)' }}>Choose file or paste JSON/YAML</label>
                <div className="flex gap-2 mb-4">
                  <Button
                    variant="bordered"
                    onPress={() => document.getElementById("file-input")?.click()}
                    startContent={<DocumentArrowUpIcon className="w-4 h-4" />}
                  >
                    Choose File
                  </Button>
                  {selectedFile && (
                    <Chip color="success" variant="flat">
                      {selectedFile.name}
                    </Chip>
                  )}
                </div>
                <input id="file-input" type="file" accept=".json,.yaml,.yml" onChange={handleFileSelect} style={{ display: "none" }} />
              </div>

              <EnhancedCodeEditor
                value={importData}
                onChange={(value) => {
                  setImportData(value);
                  setImportError("");
                  setSelectedFile(null);
                }}
                placeholder="Paste your OpenAPI/Swagger specification here or select a file above..."
                language="json"
                height={300}
                title="OpenAPI Specification (JSON/YAML)"
                className={importError ? styles.errorBorder : ""}
              />
              {importError && <p className="text-red-500 text-sm mt-2">{importError}</p>}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setIsImportOpen(false)} isDisabled={importLoading}>
              Cancel
            </Button>
            <Button
              onPress={importSpec}
              isLoading={importLoading}
              isDisabled={!importData.trim()}
              className={styles.buttonGradient}
            >
              Import
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Test Modal */}
      <Modal isOpen={isTestOpen} onClose={onTestClose} size="4xl" classNames={{
        base: "bg-[var(--grud-surface)] border border-[var(--grud-border-color)]",
        header: "border-b border-[var(--grud-border-color)] text-[var(--grud-text)]",
        footer: "border-t border-[var(--grud-border-color)]",
        closeButton: "hover:bg-[var(--grud-surface-alt)]"
      }}>
        <ModalContent>
          <ModalHeader>Test API Operation</ModalHeader>
          <ModalBody>
            {selectedOperation && (
              <div className={styles.testInterface}>
                <div className={styles.testHeader}>
                  <Chip color={getMethodColor(selectedOperation.method) as "default" | "primary" | "secondary" | "success" | "warning" | "danger"} size="sm" variant="flat">
                    {selectedOperation.method.toUpperCase()}
                  </Chip>
                  <Code>{selectedOperation.path}</Code>
                </div>

                <Tabs variant="underlined" classNames={{
                  tabList: "border-b border-[var(--grud-border-color)] w-full",
                  cursor: "bg-[var(--grud-gradient)]",
                  tabContent: "group-data-[selected=true]:text-[var(--grud-primary)]"
                }}>
                  <Tab key="request" title="Request">
                    <div className={styles.testInputs}>
                      {/* Path Parameters */}
                      {(selectedOperation.operation.parameters?.filter((p) => p.in === "path").length || 0) > 0 && (
                        <div className={styles.paramSection}>
                          <h5>Path Parameters</h5>
                          {selectedOperation.operation.parameters
                            ?.filter((p) => p.in === "path")
                            .map((param) => (
                              <Input
                                key={param.name}
                                label={param.name}
                                description={param.description}
                                isRequired={param.required}
                                variant="bordered"
                                classNames={{
                                  inputWrapper: "border-[var(--grud-border-color)] hover:border-[var(--grud-text-secondary)] focus-within:border-[var(--grud-primary)]! bg-[var(--grud-surface-alt)]",
                                  input: "text-[var(--grud-text)] placeholder:text-[var(--grud-text-secondary)]/50",
                                  label: "text-[var(--grud-text)]"
                                }}
                                onChange={(e) =>
                                  setTestData((prev) => ({
                                    ...prev,
                                    pathParams: { ...(typeof prev.pathParams === 'object' ? prev.pathParams : {}), [param.name]: e.target.value },
                                  }))
                                }
                              />
                            ))}
                        </div>
                      )}

                      {/* Query Parameters */}
                      {(selectedOperation.operation.parameters?.filter((p) => p.in === "query").length || 0) > 0 && (
                        <div className={styles.paramSection}>
                          <h5>Query Parameters</h5>
                          {selectedOperation.operation.parameters
                            ?.filter((p) => p.in === "query")
                            .map((param) => (
                              <Input
                                key={param.name}
                                label={param.name}
                                description={param.description}
                                isRequired={param.required}
                                variant="bordered"
                                classNames={{
                                  inputWrapper: "border-[var(--grud-border-color)] hover:border-[var(--grud-text-secondary)] focus-within:border-[var(--grud-primary)]! bg-[var(--grud-surface-alt)]",
                                  input: "text-[var(--grud-text)] placeholder:text-[var(--grud-text-secondary)]/50",
                                  label: "text-[var(--grud-text)]"
                                }}
                                onChange={(e) =>
                                  setTestData((prev) => ({
                                    ...prev,
                                    queryParams: { ...(typeof prev.queryParams === 'object' ? prev.queryParams : {}), [param.name]: e.target.value },
                                  }))
                                }
                              />
                            ))}
                        </div>
                      )}

                      {/* Request Body */}
                      {selectedOperation.operation.requestBody && (
                        <div className={styles.paramSection}>
                          <h5>Request Body</h5>
                          <EnhancedCodeEditor
                            value={(testData.body && typeof testData.body === 'object') ? JSON.stringify(testData.body, null, 2) : '{"key": "value"}'}
                            onChange={(value) => {
                              try {
                                const parsed = JSON.parse(value);
                                setTestData((prev) => ({ ...prev, body: parsed }));
                              } catch {
                                // Invalid JSON, don't update
                              }
                            }}
                            language="json"
                            height={150}
                            title="JSON Request Body"
                            placeholder='{"key": "value"}'
                          />
                        </div>
                      )}
                    </div>
                  </Tab>

                  <Tab key="response" title="Response">
                    {testResult ? (
                      <div className={styles.testResult}>
                        {testResult.error ? (
                          <div className={styles.error}>
                            <h5>Error</h5>
                            <Code color="danger">{testResult.error}</Code>
                          </div>
                        ) : (
                          <>
                            <div className={styles.responseStatus}>
                              <Chip color={testResult.status! < 400 ? "success" : "danger"}>
                                {testResult.status} {testResult.statusText}
                              </Chip>
                            </div>
                            <Divider className="my-4" />
                            <h5>Response Body</h5>
                            <EnhancedCodeEditor
                              value={typeof testResult.data === "object" ? JSON.stringify(testResult.data, null, 2) : String(testResult.data ?? '')}
                              readOnly
                              language={typeof testResult.data === "object" ? "json" : "plaintext"}
                              height={250}
                              allowCopy
                              title="Response Body"
                            />
                          </>
                        )}
                      </div>
                    ) : (
                      <p style={{ color: 'var(--grud-text-secondary)' }}>Send a request to see the response</p>
                    )}
                  </Tab>
                </Tabs>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onTestClose}>
              Close
            </Button>
            <Button
              onPress={testOperation}
              className={styles.buttonGradient}
            >
              Send Request
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default OpenApiViewer;
