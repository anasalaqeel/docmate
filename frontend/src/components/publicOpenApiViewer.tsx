import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Tabs,
  Tab,
  Chip,
  Badge,
  Accordion,
  AccordionItem,
  Code,
  Button,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Tooltip,
  Select,
  SelectItem,
} from '@heroui/react';
import EnhancedCodeEditor from './ui/enhancedCodeEditor';
import MarkdownRenderer from './ui/markdownRenderer';
import type { OpenApiSpec, Documentation, OpenApiOperation } from '../types/docs';
import { getPublicOpenApiSpec } from '../services/docsService';
import styles from '../styles/publicOpenApiViewer.module.css';
import { performApiTest } from '../utils/proxyRequest';

interface PublicOpenApiViewerProps {
  documentation: Documentation;
}

interface SelectedOperation {
  path: string;
  method: string;
  operation: OpenApiOperation;
  baseUrl: string;
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

const PublicOpenApiViewer = ({ documentation }: PublicOpenApiViewerProps) => {
  const [spec, setSpec] = useState<OpenApiSpec | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOperation, setSelectedOperation] = useState<SelectedOperation | null>(null);
  const [testRequest, setTestRequest] = useState<TestRequest>({});
  const [testResponse, setTestResponse] = useState<TestResponse | null>(null);
  const [isTestLoading, setIsTestLoading] = useState(false);
  const [selectedServer, setSelectedServer] = useState<string>('');
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const { isOpen: isTryItOpen, onOpen: onTryItOpen, onClose: onTryItClose } = useDisclosure();

  const fetchOpenApiSpec = useCallback(async () => {
    if (!documentation.id) return;
    
    try {
      setLoading(true);
      const result = await getPublicOpenApiSpec(documentation.id);
      if (result.success) {
        setSpec(result.data || null);
      }
    } catch (error) {
      console.error('Failed to fetch OpenAPI spec:', error);
    } finally {
      setLoading(false);
    }
  }, [documentation.id]);

  useEffect(() => {
    fetchOpenApiSpec();
  }, [fetchOpenApiSpec]);

  useEffect(() => {
    // Auto-expand first few paths for better UX
    if (spec?.paths) {
      const pathKeys = Object.keys(spec.paths).slice(0, 3);
      setExpandedPaths(new Set(pathKeys));
    }
  }, [spec]);

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'success';
      case 'POST': return 'primary';
      case 'PUT': return 'warning';
      case 'PATCH': return 'secondary';
      case 'DELETE': return 'danger';
      default: return 'default';
    }
  };

  const togglePathExpansion = (path: string) => {
    setExpandedPaths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const openTryIt = (path: string, method: string, operation: OpenApiOperation) => {
    const baseUrl = selectedServer || spec?.servers?.[0]?.url || documentation.baseUrl || '';
    setSelectedOperation({ path, method, operation, baseUrl });
    setTestRequest({
      pathParams: {},
      queryParams: {},
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });
    setTestResponse(null);
    onTryItOpen();
  };

  const executeRequest = async () => {
    if (!selectedOperation) return;
    
    setIsTestLoading(true);
    try {
      let url = selectedOperation.baseUrl + selectedOperation.path;
      
      // Replace path parameters
      Object.entries(testRequest.pathParams || {}).forEach(([key, value]) => {
        url = url.replace(`{${key}}`, encodeURIComponent(value as string));
      });
      
      // Add query parameters
      const queryParams = new URLSearchParams(testRequest.queryParams || {});
      if (queryParams.toString()) {
        url += '?' + queryParams.toString();
      }
      
      let requestBody = testRequest.body;
      if (['POST', 'PUT', 'PATCH'].includes((selectedOperation.method || 'GET').toUpperCase())) {
        try {
          requestBody = JSON.stringify(JSON.parse(testRequest.body || '{}'));
        } catch {
          requestBody = testRequest.body;
        }
      }

      const response = await performApiTest(
        url,
        selectedOperation.method || 'GET',
        testRequest.headers || {},
        requestBody
      );
      
      setTestResponse({
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
        url: response.url,
        error: response.error
      });
    } catch (error) {
      setTestResponse({
        error: error instanceof Error ? error.message : 'Request failed',
        url: selectedOperation.baseUrl + selectedOperation.path
      });
    } finally {
      setIsTestLoading(false);
    }
  };

  const generateCodeExamples = () => {
    if (!selectedOperation) return { curl: '', javascript: '', python: '' };
    
    let url = selectedOperation.baseUrl + selectedOperation.path;
    Object.entries(testRequest.pathParams || {}).forEach(([key, value]) => {
      url = url.replace(`{${key}}`, encodeURIComponent(value as string));
    });
    
    const queryParams = new URLSearchParams(testRequest.queryParams || {});
    if (queryParams.toString()) {
      url += '?' + queryParams.toString();
    }
    
    // Generate cURL
    let curl = `curl -X ${(selectedOperation.method || 'GET').toUpperCase()} "${url}"`;
    Object.entries(testRequest.headers || {}).forEach(([key, value]) => {
      curl += ` \\
  -H "${key}: ${value}"`;
    });
    if (['POST', 'PUT', 'PATCH'].includes((selectedOperation.method || 'GET').toUpperCase()) && testRequest.body) {
      curl += ` \\
  -d '${testRequest.body}'`;
    }
    
    // Generate JavaScript (fetch)
    const jsHeaders = JSON.stringify(testRequest.headers, null, 2);
    let javascript = `fetch('${url}', {
  method: '${(selectedOperation.method || 'GET').toUpperCase()}',
  headers: ${jsHeaders}`;
    
    if (['POST', 'PUT', 'PATCH'].includes((selectedOperation.method || 'GET').toUpperCase()) && testRequest.body) {
      javascript += `,
  body: '${testRequest.body}'`;
    }
    
    javascript += `
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));`;

    // Generate Python (requests)
    const pyHeaders = Object.entries(testRequest.headers || {})
      .map(([key, value]) => `    '${key}': '${value}'`)
      .join(',\n');
    
    let python = `import requests

url = '${url}'
headers = {
${pyHeaders}
}`;

    if (['POST', 'PUT', 'PATCH'].includes((selectedOperation.method || 'GET').toUpperCase()) && testRequest.body) {
      python += `
data = '${testRequest.body}'

response = requests.${(selectedOperation.method || 'GET').toLowerCase()}(url, headers=headers, data=data)`;
    } else {
      python += `

response = requests.${(selectedOperation.method || 'GET').toLowerCase()}(url, headers=headers)`;
    }
    
    python += `
print(response.json())`;
    
    return { curl, javascript, python };
  };

  useEffect(() => {
    if (spec?.servers?.[0]?.url) {
      setSelectedServer(spec.servers[0].url);
    }
  }, [spec]);

  if (loading) {
    return (
      <div className={styles.loading}>
        <p>Loading API specifications...</p>
      </div>
    );
  }

  if (!spec) {
    return null; // Don't show anything if no spec is available
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h2>{spec.info.title}</h2>
          {spec.info.description && <p className={styles.description}>{spec.info.description}</p>}
          <div className={styles.headerMeta}>
            <Chip size="sm" color="primary" variant="flat">v{spec.info.version}</Chip>
            <Chip size="sm" variant="flat">OpenAPI {spec.specVersion}</Chip>
          </div>
        </div>
      </div>

      <Tabs className={styles.tabs} variant="underlined">
        <Tab key="paths" title="API Operations">
          <div className={styles.operations}>
            {spec.paths && Object.entries(spec.paths).map(([path, pathItem]) => (
              <Card key={path} className={styles.pathCard}>
                <CardHeader className={styles.pathHeader}>
                  <div className={styles.pathHeaderContent}>
                    <h4 className={styles.pathTitle}>{path}</h4>
                    <Button
                      size="sm"
                      variant="light"
                      onPress={() => togglePathExpansion(path)}
                      className={styles.expandButton}
                    >
                      {expandedPaths.has(path) ? '−' : '+'}
                    </Button>
                  </div>
                </CardHeader>
                {expandedPaths.has(path) && (
                  <CardBody>
                    {Object.entries(pathItem).map(([method, operation]) => (
                      <div key={method} className={styles.operation}>
                        <div className={styles.operationHeader}>
                          <div className={styles.operationMeta}>
                            <Chip color={getMethodColor(method) as "default" | "primary" | "secondary" | "success" | "warning" | "danger"} size="sm" variant="flat">
                              {method.toUpperCase()}
                            </Chip>
                            <span className={styles.operationSummary}>{operation.summary}</span>
                            {operation.tags && operation.tags.map((tag: string) => (
                              <Badge key={tag} size="sm" variant="flat" color="secondary">{tag}</Badge>
                            ))}
                          </div>
                          <div className={styles.operationActions}>
                            <Tooltip content="Try this API">
                              <Button
                                size="sm"
                                color="primary"
                                variant="flat"
                                onPress={() => openTryIt(path, method, operation)}
                              >
                                Try It
                              </Button>
                            </Tooltip>
                          </div>
                        </div>
                      
                      {operation.description && (
                        <div className={styles.operationDescription}>
                          <MarkdownRenderer content={operation.description} docId={documentation.id} />
                        </div>
                      )}
                      
                      <Accordion className={styles.operationDetails} variant="splitted">
                        {operation.parameters && operation.parameters.length > 0 ? (
                          <AccordionItem key="parameters" title="Parameters">
                            <div className={styles.parameters}>
                              {operation.parameters.map((param, index: number) => (
                                <div key={index} className={styles.parameter}>
                                  <div className={styles.paramHeader}>
                                    <Code size="sm">{param.name}</Code>
                                    <span className={styles.paramType}>({param.in})</span>
                                    {param.required && <Chip size="sm" color="danger" variant="flat">Required</Chip>}
                                  </div>
                                  {param.description && (
                                    <p className={styles.paramDescription}>{param.description}</p>
                                  )}
                                  {param.schema && (
                                    <div className={styles.paramSchema}>
                                      <span className={styles.schemaType}>Type: {param.schema.type}</span>
                                      {param.schema.format && (
                                        <span className={styles.schemaFormat}>Format: {param.schema.format}</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </AccordionItem>
                        ) : null}

                        {operation.requestBody ? (
                          <AccordionItem key="request" title="Request Body">
                            {operation.requestBody.description && (
                              <p className={styles.requestDescription}>{operation.requestBody.description}</p>
                            )}
                            <EnhancedCodeEditor
                              value={JSON.stringify(operation.requestBody, null, 2)}
                              readOnly
                              language="json"
                              height={200}
                              allowCopy
                              collapsible
                              title="Request Body Schema"
                              className={styles.codeBlock}
                            />
                          </AccordionItem>
                        ) : null}

                        {operation.responses ? (
                          <AccordionItem key="responses" title="Responses">
                            <div className={styles.responses}>
                              {Object.entries(operation.responses).map(([status, response]) => (
                                <div key={status} className={styles.response}>
                                  <div className={styles.responseHeader}>
                                    <Chip
                                      size="sm"
                                      color={status.startsWith('2') ? 'success' : status.startsWith('4') ? 'warning' : 'danger'}
                                      variant="flat"
                                    >
                                      {status}
                                    </Chip>
                                    {response.description && (
                                      <span className={styles.responseDescription}>{response.description}</span>
                                    )}
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
                                      className={styles.codeBlock}
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
                )}
              </Card>
            ))}
          </div>
        </Tab>
        
        {spec.components?.schemas && Object.keys(spec.components.schemas).length > 0 && (
          <Tab key="schemas" title="Schemas">
            <div className={styles.schemas}>
              {Object.entries(spec.components.schemas).map(([name, schema]) => (
                <Card key={name} className={styles.schemaCard}>
                  <CardHeader>
                    <h4 className={styles.schemaTitle}>{name}</h4>
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
                      className={styles.codeBlock}
                    />
                  </CardBody>
                </Card>
              ))}
            </div>
          </Tab>
        )}
        
        {spec.servers && spec.servers.length > 0 && (
          <Tab key="servers" title="Servers">
            <div className={styles.servers}>
              {spec.servers.map((server, index) => (
                <Card key={index} className={styles.serverCard}>
                  <CardBody>
                    <div className={styles.serverInfo}>
                      <Code className={styles.serverUrl}>{server.url}</Code>
                      {server.description && (
                        <p className={styles.serverDescription}>{server.description}</p>
                      )}
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          </Tab>
        )}
      </Tabs>
      
      {/* Try It Modal */}
      <Modal isOpen={isTryItOpen} onClose={onTryItClose} size="5xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader className={styles.tryItHeader}>
            <div className={styles.tryItTitle}>
              <Chip color={getMethodColor(selectedOperation?.method || 'GET') as "default" | "primary" | "secondary" | "success" | "warning" | "danger"} size="sm" variant="flat">
                {selectedOperation?.method?.toUpperCase() || 'GET'}
              </Chip>
              <Code className={styles.tryItPath}>{selectedOperation?.path}</Code>
            </div>
          </ModalHeader>
          <ModalBody>
            {selectedOperation && (
              <div className={styles.tryItContent}>
                <Tabs className={styles.tryItTabs}>
                  <Tab key="request" title="Request">
                    <div className={styles.requestSection}>
                      {/* Server Selection */}
                      {spec?.servers && spec.servers.length > 0 && (
                        <div className={styles.serverSelection}>
                          <Select
                            label="Server"
                            selectedKeys={[selectedServer]}
                            onSelectionChange={(keys) => {
                              const server = Array.from(keys)[0] as string;
                              setSelectedServer(server);
                              setSelectedOperation(prev => prev ? { ...prev, baseUrl: server } : null);
                            }}
                          >
                            {spec.servers.map((server) => (
                              <SelectItem key={server.url}>
                                {server.url}
                                {server.description && ` - ${server.description}`}
                              </SelectItem>
                            ))}
                          </Select>
                        </div>
                      )}
                      
                      {/* Path Parameters */}
                      {(selectedOperation.operation.parameters?.filter((p) => p.in === 'path').length || 0) > 0 && (
                        <div className={styles.paramSection}>
                          <h4>Path Parameters</h4>
                          {selectedOperation.operation.parameters?.filter((p) => p.in === 'path').map((param) => (
                            <Input
                              key={param.name}
                              label={param.name}
                              description={param.description}
                              isRequired={param.required}
                              value={testRequest.pathParams?.[param.name] || ''}
                              onChange={(e) => setTestRequest(prev => ({
                                ...prev,
                                pathParams: { ...prev.pathParams, [param.name]: e.target.value }
                              }))}
                            />
                          ))}
                        </div>
                      )}
                      
                      {/* Query Parameters */}
                      {(selectedOperation.operation.parameters?.filter((p) => p.in === 'query').length || 0) > 0 && (
                        <div className={styles.paramSection}>
                          <h4>Query Parameters</h4>
                          {selectedOperation.operation.parameters?.filter((p) => p.in === 'query').map((param) => (
                            <Input
                              key={param.name}
                              label={param.name}
                              description={param.description}
                              isRequired={param.required}
                              value={testRequest.queryParams?.[param.name] || ''}
                              onChange={(e) => setTestRequest(prev => ({
                                ...prev,
                                queryParams: { ...prev.queryParams, [param.name]: e.target.value }
                              }))}
                            />
                          ))}
                        </div>
                      )}
                      
                      {/* Headers */}
                      <div className={styles.paramSection}>
                        <h4>Headers</h4>
                        <EnhancedCodeEditor
                          value={JSON.stringify(testRequest.headers, null, 2)}
                          onChange={(value) => {
                            try {
                              const headers = JSON.parse(value);
                              setTestRequest(prev => ({ ...prev, headers }));
                            } catch {
                              // Invalid JSON, ignore
                            }
                          }}
                          language="json"
                          height={120}
                          title="Headers (JSON)"
                        />
                      </div>
                      
                      {/* Request Body */}
                      {['POST', 'PUT', 'PATCH'].includes((selectedOperation.method || 'GET').toUpperCase()) && (
                        <div className={styles.paramSection}>
                          <h4>Request Body</h4>
                          <EnhancedCodeEditor
                            value={testRequest.body || '{}'}
                            onChange={(value) => setTestRequest(prev => ({ ...prev, body: value }))}
                            language="json"
                            height={200}
                            title="Body (JSON)"
                          />
                        </div>
                      )}
                    </div>
                  </Tab>
                  
                  <Tab key="response" title="Response">
                    {testResponse ? (
                      <div className={styles.responseSection}>
                        {testResponse.error ? (
                          <Card className="border-danger">
                            <CardBody>
                              <h4 className="text-danger">Error</h4>
                              <Code color="danger" className="block mt-2">{testResponse.error}</Code>
                              {testResponse.url && (
                                <p className="text-sm text-[var(--docmate-text-secondary)] mt-2">URL: {testResponse.url}</p>
                              )}
                            </CardBody>
                          </Card>
                        ) : (
                          <>
                            <div className={styles.responseStatus}>
                              <Chip color={(testResponse.status ?? 0) < 400 ? 'success' : 'danger'} variant="flat">
                                {testResponse.status} {testResponse.statusText}
                              </Chip>
                              <Code className="text-xs">{testResponse.url}</Code>
                            </div>
                            
                            <div className={styles.responseHeaders}>
                              <h4>Response Headers</h4>
                              <EnhancedCodeEditor
                                value={JSON.stringify(testResponse.headers, null, 2)}
                                readOnly
                                language="json"
                                height={120}
                                allowCopy
                                title="Response Headers"
                                className="text-xs"
                              />
                            </div>
                            
                            <div className={styles.responseBody}>
                              <h4>Response Body</h4>
                              <EnhancedCodeEditor
                                value={typeof testResponse.data === 'object'
                                  ? JSON.stringify(testResponse.data, null, 2)
                                  : String(testResponse.data ?? '')}
                                readOnly
                                language={typeof testResponse.data === 'object' ? 'json' : 'plaintext'}
                                height={200}
                                allowCopy
                                title="Response Body"
                                className="text-xs"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className={styles.emptyResponse}>
                        <p>Send a request to see the response</p>
                      </div>
                    )}
                  </Tab>
                  
                  <Tab key="curl" title="Code Examples">
                    <div className={styles.codeExamples}>
                      {(() => {
                        const examples = generateCodeExamples();
                        return (
                          <Tabs variant="underlined">
                            <Tab key="curl" title="cURL">
                              <EnhancedCodeEditor
                                value={examples.curl}
                                readOnly
                                language="plaintext"
                                height={150}
                                allowCopy
                                title="cURL Command"
                                className="text-xs"
                              />
                            </Tab>
                            <Tab key="javascript" title="JavaScript">
                              <EnhancedCodeEditor
                                value={examples.javascript}
                                readOnly
                                language="javascript"
                                height={200}
                                allowCopy
                                title="JavaScript (fetch)"
                                className="text-xs"
                              />
                            </Tab>
                            <Tab key="python" title="Python">
                              <EnhancedCodeEditor
                                value={examples.python}
                                readOnly
                                language="plaintext"
                                height={200}
                                allowCopy
                                title="Python (requests)"
                                className="text-xs"
                              />
                            </Tab>
                          </Tabs>
                        );
                      })()} 
                    </div>
                  </Tab>
                </Tabs>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onTryItClose}>
              Close
            </Button>
            <Button 
              color="primary" 
              onPress={executeRequest}
              isLoading={isTestLoading}
            >
              Send Request
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default PublicOpenApiViewer;