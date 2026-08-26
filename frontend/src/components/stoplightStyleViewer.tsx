import { useState, useEffect, useCallback } from 'react';
import {
  Chip,
  Button,
  Input,
  Code,
  Tabs,
  Tab,
  Spinner,
  Textarea,
} from '@heroui/react';
import type { OpenApiSpec, Documentation, OpenApiOperation, JsonSchema } from '../types/docs';
import { getPublicOpenApiSpec } from '../services/docsService';
import styles from '../styles/stoplightStyleViewer.module.css';
import { performApiTest } from '../utils/proxyRequest';

interface StoplightStyleViewerProps {
  documentation: Documentation;
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
  data?: unknown;
  error?: string;
}

const StoplightStyleViewer = ({ documentation }: StoplightStyleViewerProps) => {
  const [spec, setSpec] = useState<OpenApiSpec | null>(null);
  const [loading, setLoading] = useState(true);
  const [operations, setOperations] = useState<OperationItem[]>([]);
  const [selectedOperation, setSelectedOperation] = useState<OperationItem | null>(null);
  const [testRequest, setTestRequest] = useState<TestRequest>({});
  const [testResponse, setTestResponse] = useState<TestResponse | null>(null);
  const [isTestLoading, setIsTestLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const parseOperations = useCallback((spec: OpenApiSpec) => {
    const ops: OperationItem[] = [];
    if (spec.paths) {
      Object.entries(spec.paths).forEach(([path, pathItem]) => {
        Object.entries(pathItem).forEach(([method, operation]) => {
          const tag = operation.tags?.[0] || 'General';
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
      console.error('Failed to fetch OpenAPI spec:', error);
    } finally {
      setLoading(false);
    }
  }, [documentation.id, parseOperations]);

  useEffect(() => {
    fetchOpenApiSpec();
  }, [fetchOpenApiSpec]);

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'var(--docmate-success)';
      case 'POST': return 'var(--docmate-primary)';
      case 'PUT': return 'var(--docmate-warning)';
      case 'PATCH': return 'var(--docmate-secondary)';
      case 'DELETE': return 'var(--docmate-error)';
      default: return 'var(--docmate-text-secondary)';
    }
  };

  const groupedOperations = operations.reduce((acc, op) => {
    const tag = op.tag || 'General';
    if (!acc[tag]) acc[tag] = [];
    acc[tag].push(op);
    return acc;
  }, {} as Record<string, OperationItem[]>);

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
                  <code className={styles.paramType}>
                    {param.schema?.type || param.type || 'string'}
                  </code>
                </td>
                <td>
                  <span className={styles.paramIn}>{param.in}</span>
                </td>
                <td>{param.description || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderJsonSchema = (schema: JsonSchema, name?: string): React.JSX.Element | null => {
    if (!schema) return null;

    if (schema.type === 'object' && schema.properties) {
      return (
        <div className={styles.schemaObject}>
          {name && <div className={styles.schemaTitle}>{name}</div>}
          <div className={styles.schemaContent}>
            {Object.entries(schema.properties).map(([propName, propSchema]: [string, JsonSchema]) => (
              <div key={propName} className={styles.schemaProperty}>
                <div className={styles.propertyLine}>
                  <span className={styles.propertyName}>"{propName}"</span>
                  <span className={styles.propertyColon}>:</span>
                  <span className={styles.propertyType}>
                    {propSchema.type || 'any'}
                    {schema.required?.includes(propName) && <span className={styles.required}>*</span>}
                  </span>
                </div>
                {propSchema.description && (
                  <div className={styles.propertyDescription}>
                    // {propSchema.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className={styles.schemaSimple}>
        <code>{schema.type || 'any'}</code>
        {schema.description && (
          <span className={styles.schemaDescription}> // {schema.description}</span>
        )}
      </div>
    );
  };

  const executeRequest = async () => {
    if (!selectedOperation) return;
    
    setIsTestLoading(true);
    try {
      const baseUrl = spec?.servers?.[0]?.url || documentation.baseUrl || '';
      let url = baseUrl + selectedOperation.path;
      
      // Replace path parameters
      Object.entries(testRequest.pathParams || {}).forEach(([key, value]) => {
        url = url.replace(`{${key}}`, encodeURIComponent(value as string));
      });
      
      // Add query parameters
      const queryParams = new URLSearchParams(testRequest.queryParams || {});
      if (queryParams.toString()) {
        url += '?' + queryParams.toString();
      }
      
      const response = await performApiTest(
        url,
        selectedOperation.method,
        { 'Content-Type': 'application/json', ...testRequest.headers },
        testRequest.body
      );
      
      setTestResponse({
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        error: response.error,
      });
    } catch (error) {
      setTestResponse({
        error: error instanceof Error ? error.message : 'Request failed'
      });
    } finally {
      setIsTestLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <Spinner size="lg" />
        <p>Loading API Documentation...</p>
      </div>
    );
  }

  if (!spec) {
    return (
      <div className={styles.noSpec}>
        <p>No API specification found</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Left Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2>{spec.info.title}</h2>
          <div className={styles.version}>v{spec.info.version}</div>
        </div>
        
        <div className={styles.sidebarContent}>
          {Object.entries(groupedOperations).map(([tag, ops]) => (
            <div key={tag} className={styles.tagGroup}>
              <h3 className={styles.tagTitle}>{tag}</h3>
              <div className={styles.operationsList}>
                {ops.map((op) => (
                  <button
                    key={op.id}
                    className={`${styles.operationItem} ${selectedOperation?.id === op.id ? styles.active : ''}`}
                    onClick={() => setSelectedOperation(op)}
                  >
                    <span 
                      className={styles.methodBadge}
                      style={{ backgroundColor: getMethodColor(op.method) }}
                    >
                      {op.method}
                    </span>
                    <div className={styles.operationInfo}>
                      <div className={styles.operationSummary}>{op.summary}</div>
                      <div className={styles.operationPath}>{op.path}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.mainContent}>
        {selectedOperation && (
          <div className={styles.operationDetails}>
            {/* Header */}
            <div className={styles.operationHeader}>
              <div className={styles.operationTitle}>
                <span 
                  className={styles.methodChip}
                  style={{ backgroundColor: getMethodColor(selectedOperation.method) }}
                >
                  {selectedOperation.method}
                </span>
                <h1>{selectedOperation.summary}</h1>
              </div>
              <code className={styles.operationPath}>{selectedOperation.path}</code>
              {selectedOperation.operation.description && (
                <p className={styles.operationDescription}>
                  {selectedOperation.operation.description}
                </p>
              )}
            </div>

            {/* Content Tabs */}
            <Tabs 
              selectedKey={activeTab} 
              onSelectionChange={(key) => setActiveTab(key as string)}
              className={styles.contentTabs}
            >
              <Tab key="overview" title="Overview">
                <div className={styles.tabContent}>
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
                          <p>{selectedOperation.operation.requestBody.description}</p>
                        )}
                        {selectedOperation.operation.requestBody.content && (
                          <div className={styles.contentTypes}>
                            {Object.entries(selectedOperation.operation.requestBody.content).map(([contentType, content]) => (
                              <div key={contentType} className={styles.contentTypeSection}>
                                <h4>Content-Type: <code>{contentType}</code></h4>
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
                              <Chip
                                size="sm"
                                style={{
                                  backgroundColor: status.startsWith('2') ? 'var(--docmate-success)' : status.startsWith('4') ? 'var(--docmate-warning)' : 'var(--docmate-error)',
                                  color: 'white'
                                }}
                              >
                                {status}
                              </Chip>
                              <span>{response.description}</span>
                            </div>
                            {response.content && (
                              <div className={styles.responseContent}>
                                {Object.entries(response.content).map(([contentType, content]) => (
                                  <div key={contentType} className={styles.responseContentType}>
                                    <h5>Content-Type: <code>{contentType}</code></h5>
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
                      {(selectedOperation.operation.parameters?.filter((p) => p.in === 'path').length || 0) > 0 && (
                        <div className={styles.formSection}>
                          <h4>Path Parameters</h4>
                          {selectedOperation.operation.parameters?.filter((p) => p.in === 'path').map((param) => (
                            <Input
                              key={param.name}
                              label={param.name}
                              placeholder={param.description}
                              isRequired={param.required}
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
                        <div className={styles.formSection}>
                          <h4>Query Parameters</h4>
                          {selectedOperation.operation.parameters?.filter((p) => p.in === 'query').map((param) => (
                            <Input
                              key={param.name}
                              label={param.name}
                              placeholder={param.description}
                              isRequired={param.required}
                              onChange={(e) => setTestRequest(prev => ({
                                ...prev,
                                queryParams: { ...prev.queryParams, [param.name]: e.target.value }
                              }))}
                            />
                          ))}
                        </div>
                      )}

                      {/* Request Body */}
                      {['POST', 'PUT', 'PATCH'].includes(selectedOperation.method) && (
                        <div className={styles.formSection}>
                          <h4>Request Body</h4>
                          <Textarea
                            placeholder="Enter JSON request body"
                            minRows={8}
                            value={testRequest.body || ''}
                            onChange={(e) => setTestRequest(prev => ({ ...prev, body: e.target.value }))}
                            className={styles.requestBodyInput}
                          />
                        </div>
                      )}

                      <Button
                        color="primary"
                        size="lg"
                        onPress={executeRequest}
                        isLoading={isTestLoading}
                        className={styles.sendButton}
                      >
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
                              <Chip
                                style={{
                                  backgroundColor: (testResponse.status ?? 0) < 400 ? 'var(--docmate-success)' : 'var(--docmate-error)',
                                  color: 'white'
                                }}
                              >
                                {testResponse.status} {testResponse.statusText}
                              </Chip>
                            </div>
                            <div className={styles.responseBody}>
                              <h4>Response Body</h4>
                              <Code className={styles.responseCode}>
                                {typeof testResponse.data === 'object'
                                  ? JSON.stringify(testResponse.data, null, 2)
                                  : String(testResponse.data ?? '')}
                              </Code>
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
        )}
      </main>
    </div>
  );
};

export default StoplightStyleViewer;