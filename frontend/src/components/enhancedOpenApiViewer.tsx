import { useState, useEffect } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Tabs,
  Tab,
  Chip,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Code,
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
} from '@heroui/react';
import EnhancedCodeEditor from './ui/enhancedCodeEditor';
import type { OpenApiSpec, Documentation, OpenApiOperation, JsonSchema } from '../types/docs';
import { getPublicOpenApiSpec } from '../services/docsService';
import styles from '../styles/enhancedOpenApiViewer.module.css';

interface EnhancedOpenApiViewerProps {
  documentation: Documentation;
}

interface SelectedOperation {
  path: string;
  method: string;
  operation: OpenApiOperation;
  baseUrl: string;
}

const EnhancedOpenApiViewer = ({ documentation }: EnhancedOpenApiViewerProps) => {
  const [spec, setSpec] = useState<OpenApiSpec | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOperation, setSelectedOperation] = useState<SelectedOperation | null>(null);
  const { isOpen: isTryItOpen, onOpen: onTryItOpen, onClose: onTryItClose } = useDisclosure();

  useEffect(() => {
    const fetchOpenApiSpec = async () => {
      if (!documentation.id) return;

      try {
        setLoading(true);
        const result = await getPublicOpenApiSpec(documentation.id);
        if (result.success && result.data) {
          setSpec(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch OpenAPI spec:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOpenApiSpec();
  }, [documentation.id]);

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

  const openTryIt = (path: string, method: string, operation: OpenApiOperation) => {
    const baseUrl = spec?.servers?.[0]?.url || documentation.baseUrl || '';
    setSelectedOperation({ path, method, operation, baseUrl });
    onTryItOpen();
  };

  const renderJsonSchema = (schema: JsonSchema, level: number = 0): React.ReactNode => {
    if (!schema) return null;

    const indent = level * 20;
    
    if (schema.type === 'object' && schema.properties) {
      return (
        <div className={styles.schemaObject} style={{ marginLeft: `${indent}px` }}>
          <div className={styles.schemaType}>object</div>
          <div className={styles.schemaProperties}>
            {Object.entries(schema.properties).map(([propName, propSchema]: [string, JsonSchema]) => (
              <div key={propName} className={styles.schemaProperty}>
                <div className={styles.propertyHeader}>
                  <span className={styles.propertyName}>{propName}</span>
                  {schema.required?.includes(propName) && (
                    <Chip size="sm" color="danger" variant="flat">required</Chip>
                  )}
                  <span className={styles.propertyType}>
                    {propSchema.type || 'any'}
                    {propSchema.format && ` (${propSchema.format})`}
                  </span>
                </div>
                {propSchema.description && (
                  <div className={styles.propertyDescription}>
                    {propSchema.description}
                  </div>
                )}
                {propSchema.example !== undefined && (
                  <div className={styles.propertyExample}>
                    <Code size="sm">{JSON.stringify(propSchema.example)}</Code>
                  </div>
                )}
                {propSchema.type === 'object' && propSchema.properties && (
                  <div className={styles.nestedSchema}>
                    {renderJsonSchema(propSchema, level + 1)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className={styles.schemaSimple} style={{ marginLeft: `${indent}px` }}>
        <span className={styles.schemaType}>{schema.type || 'any'}</span>
        {schema.format && <span className={styles.schemaFormat}>({schema.format})</span>}
        {schema.description && (
          <span className={styles.schemaDescription}>{schema.description}</span>
        )}
      </div>
    );
  };

  const renderParameters = (parameters: OpenApiOperation['parameters']) => {
    if (!parameters || parameters.length === 0) return null;

    const pathParams = parameters.filter(p => p.in === 'path');
    const queryParams = parameters.filter(p => p.in === 'query');
    const headerParams = parameters.filter(p => p.in === 'header');

    return (
      <div className={styles.parametersSection}>
        {pathParams.length > 0 && (
          <div className={styles.parameterGroup}>
            <h4>Path Parameters</h4>
            <Table aria-label="Path parameters" className={styles.parameterTable}>
              <TableHeader>
                <TableColumn>NAME</TableColumn>
                <TableColumn>TYPE</TableColumn>
                <TableColumn>DESCRIPTION</TableColumn>
              </TableHeader>
              <TableBody>
                {pathParams.map((param, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div className={styles.parameterName}>
                        <Code size="sm">{param.name}</Code>
                        {param.required && <Chip size="sm" color="danger" variant="flat">required</Chip>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Code size="sm" className={styles.parameterType}>
                        {param.schema?.type || param.type || 'string'}
                      </Code>
                    </TableCell>
                    <TableCell>{param.description || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {queryParams.length > 0 && (
          <div className={styles.parameterGroup}>
            <h4>Query Parameters</h4>
            <Table aria-label="Query parameters" className={styles.parameterTable}>
              <TableHeader>
                <TableColumn>NAME</TableColumn>
                <TableColumn>TYPE</TableColumn>
                <TableColumn>DESCRIPTION</TableColumn>
              </TableHeader>
              <TableBody>
                {queryParams.map((param, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div className={styles.parameterName}>
                        <Code size="sm">{param.name}</Code>
                        {param.required && <Chip size="sm" color="danger" variant="flat">required</Chip>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Code size="sm" className={styles.parameterType}>
                        {param.schema?.type || param.type || 'string'}
                      </Code>
                    </TableCell>
                    <TableCell>{param.description || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {headerParams.length > 0 && (
          <div className={styles.parameterGroup}>
            <h4>Header Parameters</h4>
            <Table aria-label="Header parameters" className={styles.parameterTable}>
              <TableHeader>
                <TableColumn>NAME</TableColumn>
                <TableColumn>TYPE</TableColumn>
                <TableColumn>DESCRIPTION</TableColumn>
              </TableHeader>
              <TableBody>
                {headerParams.map((param, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div className={styles.parameterName}>
                        <Code size="sm">{param.name}</Code>
                        {param.required && <Chip size="sm" color="danger" variant="flat">required</Chip>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Code size="sm" className={styles.parameterType}>
                        {param.schema?.type || param.type || 'string'}
                      </Code>
                    </TableCell>
                    <TableCell>{param.description || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <p>Loading API specifications...</p>
      </div>
    );
  }

  if (!spec) {
    return null;
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h1>{spec.info.title}</h1>
          {spec.info.description && <p className={styles.description}>{spec.info.description}</p>}
          <div className={styles.headerMeta}>
            <Chip size="sm" color="primary" variant="flat">v{spec.info.version}</Chip>
            <Chip size="sm" variant="flat">OpenAPI {spec.specVersion}</Chip>
          </div>
        </div>
      </div>

      {/* Operations */}
      <div className={styles.operations}>
        {spec.paths && Object.entries(spec.paths).map(([path, pathItem]) =>
          Object.entries(pathItem).map(([method, operation]) => (
            <Card key={`${method}-${path}`} className={styles.operationCard}>
              <CardHeader className={styles.operationHeader}>
                <div className={styles.operationMeta}>
                  <Chip color={getMethodColor(method) as "default" | "primary" | "secondary" | "success" | "warning" | "danger"} size="md" variant="flat" className={styles.methodChip}>
                    {method.toUpperCase()}
                  </Chip>
                  <div className={styles.operationInfo}>
                    <h3 className={styles.operationSummary}>{operation.summary || `${method.toUpperCase()} ${path}`}</h3>
                    <Code className={styles.operationPath}>{path}</Code>
                  </div>
                </div>
                <div className={styles.operationActions}>
                  <Button
                    color="primary"
                    variant="flat"
                    size="sm"
                    onPress={() => openTryIt(path, method, operation)}
                  >
                    Try It
                  </Button>
                </div>
              </CardHeader>
              
              <CardBody className={styles.operationBody}>
                {operation.description && (
                  <div className={styles.operationDescription}>
                    <p>{operation.description}</p>
                  </div>
                )}

                <Tabs className={styles.operationTabs} variant="underlined">
                  {/* Parameters Tab */}
                  {operation.parameters && operation.parameters.length > 0 && (
                    <Tab key="parameters" title="Parameters">
                      {renderParameters(operation.parameters)}
                    </Tab>
                  )}

                  {/* Request Body Tab */}
                  {operation.requestBody && (
                    <Tab key="request" title="Request Body">
                      <div className={styles.requestBodySection}>
                        {operation.requestBody.description && (
                          <p className={styles.sectionDescription}>{operation.requestBody.description}</p>
                        )}

                        {operation.requestBody.content && (
                          <div className={styles.contentTypes}>
                            {Object.entries(operation.requestBody.content).map(([contentType, content]) => (
                              <div key={contentType} className={styles.contentType}>
                                <h5>Content-Type: <Code size="sm">{contentType}</Code></h5>
                                {content.schema && (
                                  <div className={styles.schemaSection}>
                                    <h6>Schema:</h6>
                                    {renderJsonSchema(content.schema)}
                                  </div>
                                )}
                                {content.example !== undefined && (
                                  <div className={styles.exampleSection}>
                                    <h6>Example:</h6>
                                    <EnhancedCodeEditor
                                      value={typeof content.example === 'string' ? content.example : JSON.stringify(content.example, null, 2)}
                                      readOnly
                                      language="json"
                                      height={200}
                                      allowCopy
                                      collapsible
                                      title="Request Example"
                                      className={styles.exampleCode}
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </Tab>
                  )}

                  {/* Responses Tab */}
                  {operation.responses && (
                    <Tab key="responses" title="Responses">
                      <div className={styles.responsesSection}>
                        {Object.entries(operation.responses).map(([status, response]) => (
                          <div key={status} className={styles.responseItem}>
                            <div className={styles.responseHeader}>
                              <Chip 
                                size="sm" 
                                color={status.startsWith('2') ? 'success' : status.startsWith('4') ? 'warning' : 'danger'}
                                variant="flat"
                              >
                                {status}
                              </Chip>
                              <span className={styles.responseDescription}>
                                {response.description || 'No description'}
                              </span>
                            </div>

                            {response.content && (
                              <div className={styles.responseContent}>
                                {Object.entries(response.content).map(([contentType, content]) => (
                                  <div key={contentType} className={styles.responseContentType}>
                                    <h6>Content-Type: <Code size="sm">{contentType}</Code></h6>
                                    {content.schema && (
                                      <div className={styles.schemaSection}>
                                        <h6>Schema:</h6>
                                        {renderJsonSchema(content.schema)}
                                      </div>
                                    )}
                                    {content.example !== undefined && (
                                      <div className={styles.exampleSection}>
                                        <h6>Example:</h6>
                                        <EnhancedCodeEditor
                                          value={typeof content.example === 'string' ? content.example : JSON.stringify(content.example, null, 2)}
                                          readOnly
                                          language="json"
                                          height={200}
                                          allowCopy
                                          collapsible
                                          title="Response Example"
                                          className={styles.exampleCode}
                                        />
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </Tab>
                  )}
                </Tabs>
              </CardBody>
            </Card>
          ))
        )}
      </div>

      {/* Try It Modal - keeping the existing modal code */}
      <Modal isOpen={isTryItOpen} onClose={onTryItClose} size="5xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>
            <div className={styles.tryItTitle}>
              <Chip color={getMethodColor(selectedOperation?.method || 'GET') as "default" | "primary" | "secondary" | "success" | "warning" | "danger"} size="sm" variant="flat">
                {selectedOperation?.method?.toUpperCase() || 'GET'}
              </Chip>
              <Code>{selectedOperation?.path}</Code>
            </div>
          </ModalHeader>
          <ModalBody>
            <div className={styles.tryItContent}>
              <p>Interactive testing functionality - implementation in progress</p>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onTryItClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default EnhancedOpenApiViewer;