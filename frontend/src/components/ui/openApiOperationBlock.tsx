import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Tabs,
  Tab,
  Textarea,
  Input,
  Select,
  SelectItem,
  Accordion,
  AccordionItem,
  Code
} from '@heroui/react';
import Switch from "./Switch";
import { PlayIcon, PencilIcon, XMarkIcon } from '@heroicons/react/24/outline';
import httpService from '../../services/httpService';
import type { JsonSchema, CrudOperation } from '../../types/docs';
import EnhancedCodeEditor from './enhancedCodeEditor';

// Type definitions for OpenAPI components
interface Parameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required?: boolean;
  description?: string;
  schema?: JsonSchema;
  example?: unknown;
  type?: string;
}

interface ResponseDefinition {
  description?: string;
  schema?: JsonSchema;
  examples?: Record<string, unknown>;
}

interface SecurityRequirement {
  type: string;
  name?: string;
  in?: string;
  scheme?: string;
  bearerFormat?: string;
}

interface OpenApiOperationBlockProps {
  operationId?: number;
  method?: string;
  endpoint?: string;
  title?: string;
  description?: string;
  operationId_openapi?: string;
  summary?: string;
  tags?: string[];
  parameters?: Parameter[];
  requestBody?: {
    description?: string;
    required?: boolean;
    content: Record<string, { schema: JsonSchema; examples?: Record<string, unknown> }>;
  };
  responses?: Record<string, ResponseDefinition>;
  security?: SecurityRequirement[];
  deprecated?: boolean;
  onSave?: (operation: CrudOperation) => void;
  onRemove?: () => void;
  pageId?: number;
  embedded?: boolean;
}

const OpenApiOperationBlock = ({
  operationId,
  method = 'GET',
  endpoint = '',
  title = '',
  description = '',
  operationId_openapi = '',
  summary = '',
  tags = [],
  parameters = [],
  requestBody,
  responses = {},
  security = [],
  deprecated = false,
  onSave,
  onRemove,
  pageId,
  embedded = false
}: OpenApiOperationBlockProps) => {
  const [operation, setOperation] = useState<CrudOperation | null>(null);
  const [isEditing, setIsEditing] = useState(!operationId);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string>('');
  const [testParameters, setTestParameters] = useState<Record<string, unknown>>({});
  const [testRequestBody, setTestRequestBody] = useState<string>('{}');
  const [testHeaders, setTestHeaders] = useState<Record<string, string>>({});

  // Removed unused modal states - using enhanced editors instead

  const [formData, setFormData] = useState({
    method: method,
    endpoint: endpoint,
    title: title,
    description: description,
    operationId: operationId_openapi,
    summary: summary,
    tags: tags.join(', '),
    parameters: JSON.stringify(parameters, null, 2),
    requestBody: JSON.stringify(requestBody || {}, null, 2),
    responses: JSON.stringify(responses, null, 2),
    security: JSON.stringify(security, null, 2),
    deprecated: deprecated
  });

  // Removed unused modal form states - using direct JSON editing instead

  const loadOperation = useCallback(async () => {
    if (!operationId) return;

    try {
      const op = await httpService.get<CrudOperation>(`/docs/crud-operations/${operationId}`);
      setOperation(op);

      const parsedParams = op.parameters || [];
      const parsedResponses = op.responses || {};
      const parsedSecurity = op.security || [];

      setFormData({
        method: op.method,
        endpoint: op.endpoint,
        title: op.title,
        description: op.description || '',
        operationId: op.operationId || '',
        summary: op.summary || '',
        tags: (op.tags || []).join(', '),
        parameters: JSON.stringify(parsedParams, null, 2),
        requestBody: JSON.stringify(op.requestSchema ? {
          content: { 'application/json': { schema: op.requestSchema } }
        } : {}, null, 2),
        responses: JSON.stringify(parsedResponses, null, 2),
        security: JSON.stringify(parsedSecurity, null, 2),
        deprecated: op.deprecated || false
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to load operation:', error);
    }
  }, [operationId]);

  useEffect(() => {
    if (operationId) {
      loadOperation();
    }
    // Initialize test parameters from operation parameters
    const paramObj: Record<string, unknown> = {};
    parameters.forEach(param => {
      paramObj[param.name] = param.example || '';
    });
    setTestParameters(paramObj);
  }, [operationId, parameters, loadOperation]);

  const handleSave = async () => {
    try {
      let parsedParams, parsedRequestBody, parsedResponses, parsedSecurity;

      try {
        parsedParams = formData.parameters ? JSON.parse(formData.parameters) : [];
      } catch {
        parsedParams = [];
      }

      try {
        parsedRequestBody = formData.requestBody ? JSON.parse(formData.requestBody) : null;
      } catch {
        parsedRequestBody = null;
      }

      try {
        parsedResponses = formData.responses ? JSON.parse(formData.responses) : {};
      } catch {
        parsedResponses = {};
      }

      try {
        parsedSecurity = formData.security ? JSON.parse(formData.security) : [];
      } catch {
        parsedSecurity = [];
      }

      const operationData = {
        method: formData.method,
        endpoint: formData.endpoint,
        title: formData.title,
        description: formData.description || null,
        operationId: formData.operationId || null,
        summary: formData.summary || null,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : [],
        parameters: parsedParams,
        requestSchema: parsedRequestBody?.content?.['application/json']?.schema || null,
        responses: parsedResponses,
        security: parsedSecurity,
        deprecated: formData.deprecated,
        order: 0
      };

      let savedOperation;

      if (operationId) {
        await httpService.put(`/docs/crud-operations/${operationId}`, operationData);
        savedOperation = {
          ...operation!,
          ...operationData,
          id: operationId,
          description: operationData.description ?? undefined,
          operationId: operationData.operationId ?? undefined,
          summary: operationData.summary ?? undefined
        } as CrudOperation;
      } else if (pageId) {
        savedOperation = await httpService.post<CrudOperation>(`/docs/pages/${pageId}/crud-operations`, operationData);
      }

      if (savedOperation) {
        setOperation(savedOperation);
        onSave?.(savedOperation);
      }
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save operation:', error);
    }
  };

  const handleTest = async () => {
    if (!operation) return;

    setIsTesting(true);
    try {
      // Build URL with path parameters
      let testUrl = operation.endpoint;
      Object.entries(testParameters).forEach(([key, value]) => {
        testUrl = testUrl.replace(`{${key}}`, encodeURIComponent(String(value)));
      });

      // Add query parameters
      const queryParams = new URLSearchParams();
      Object.entries(testParameters).forEach(([key, value]) => {
        if (value && !operation.endpoint.includes(`{${key}}`)) {
          queryParams.append(key, String(value));
        }
      });

      if (queryParams.toString()) {
        testUrl += `?${queryParams.toString()}`;
      }

      const isExternalUrl = testUrl.startsWith('http') && !testUrl.startsWith(window.location.origin);
      
      let result;

      if (isExternalUrl) {
        // Use proxy for external URLs to avoid CORS issues
        const proxyResponse = await httpService.post<{
          status: number;
          statusText: string;
          headers: Record<string, string>;
          data: unknown;
        }>('/proxy', {
          url: testUrl,
          method: operation.method,
          headers: {
            'Content-Type': 'application/json',
            ...testHeaders
          },
          body: operation.method !== 'GET' ? (function() {
            try {
              return JSON.parse(testRequestBody);
            } catch {
              return testRequestBody;
            }
          })() : undefined
        });

        result = {
          status: proxyResponse.status,
          statusText: proxyResponse.statusText,
          headers: proxyResponse.headers,
          body: proxyResponse.data
        };
      } else {
        // Build request for local URL
        const requestOptions: RequestInit = {
          method: operation.method,
          headers: {
            'Content-Type': 'application/json',
            ...testHeaders
          }
        };

        // Add request body for non-GET requests
        if (operation.method !== 'GET' && testRequestBody) {
          try {
            requestOptions.body = JSON.stringify(JSON.parse(testRequestBody));
          } catch {
            requestOptions.body = testRequestBody;
          }
        }

        const response = await fetch(testUrl, requestOptions);
        const responseText = await response.text();

        let responseJson;
        try {
          responseJson = JSON.parse(responseText);
        } catch {
          responseJson = responseText;
        }

        result = {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseJson
        };
      }

      setTestResult(JSON.stringify(result, null, 2));
    } catch (error) {
      setTestResult(`Error: ${error}`);
    } finally {
      setIsTesting(false);
    }
  };

  // Helper function to generate example data from JSON schema
  const generateExampleFromSchema = (schema: JsonSchema): unknown => {
    if (schema.example !== undefined) {
      return schema.example;
    }

    switch (schema.type) {
      case 'string':
        return schema.enum ? schema.enum[0] : (schema.format === 'email' ? 'user@example.com' : 'example');
      case 'number':
      case 'integer':
        return schema.enum ? schema.enum[0] : 0;
      case 'boolean':
        return false;
      case 'array':
        return schema.items ? [generateExampleFromSchema(schema.items as JsonSchema)] : [];
      case 'object':
        if (schema.properties) {
          const example: Record<string, unknown> = {};
          Object.entries(schema.properties).forEach(([key, prop]) => {
            example[key] = generateExampleFromSchema(prop);
          });
          return example;
        }
        return {};
      default:
        return null;
    }
  };

  // Removed unused modal handler functions - using template buttons instead

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

  if (isEditing) {
    return (
      <Card className={`my-4 ${embedded ? 'shadow-sm' : 'shadow-md'}`}>
        <CardHeader className="flex justify-between items-center">
          <h4 className="text-lg font-semibold">
            {operationId ? 'Edit OpenAPI Operation' : 'New OpenAPI Operation'}
          </h4>
          <div className="flex gap-2">
            <Button
              variant="light"
              size="sm"
              onPress={() => {
                if (operationId) {
                  setIsEditing(false);
                } else {
                  onRemove?.();
                }
              }}
            >
              Cancel
            </Button>
            <Button
              color="primary"
              size="sm"
              onPress={handleSave}
              isDisabled={!formData.title.trim() || !formData.endpoint.trim()}
            >
              Save
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          <Tabs className="w-full">
            <Tab key="basic" title="Basic Info">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <Select
                    label="Method"
                    selectedKeys={[formData.method]}
                    onSelectionChange={(keys) => {
                      const method = Array.from(keys)[0] as string;
                      setFormData(prev => ({ ...prev, method }));
                    }}
                    className="w-32"
                  >
                    <SelectItem key="GET">GET</SelectItem>
                    <SelectItem key="POST">POST</SelectItem>
                    <SelectItem key="PUT">PUT</SelectItem>
                    <SelectItem key="PATCH">PATCH</SelectItem>
                    <SelectItem key="DELETE">DELETE</SelectItem>
                    <SelectItem key="HEAD">HEAD</SelectItem>
                    <SelectItem key="OPTIONS">OPTIONS</SelectItem>
                  </Select>

                  <Input
                    label="Endpoint"
                    placeholder="/api/users/{id}"
                    value={formData.endpoint}
                    onChange={(e) => setFormData(prev => ({ ...prev, endpoint: e.target.value }))}
                    className="flex-1"
                  />
                </div>

                <Input
                  label="Title"
                  placeholder="Get user by ID"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />

                <Input
                  label="Operation ID (OpenAPI)"
                  placeholder="getUserById"
                  value={formData.operationId}
                  onChange={(e) => setFormData(prev => ({ ...prev, operationId: e.target.value }))}
                />

                <Input
                  label="Summary"
                  placeholder="Retrieves a specific user"
                  value={formData.summary}
                  onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                />

                <Textarea
                  label="Description"
                  placeholder="Detailed description of what this operation does..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  minRows={3}
                />

                <Input
                  label="Tags (comma-separated)"
                  placeholder="users, authentication"
                  value={formData.tags}
                  onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                />

                <Switch
                  isSelected={formData.deprecated}
                  onValueChange={(checked) => setFormData(prev => ({ ...prev, deprecated: checked }))}
                >
                  Deprecated
                </Switch>
              </div>
            </Tab>

            <Tab key="parameters" title="Parameters">
              <div className="space-y-6">
                <div className="bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                  <h5 className="font-medium text-purple-900 dark:text-purple-100 mb-2">Define API Parameters</h5>
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    Define parameters that your API endpoint accepts. Include path, query, header, and cookie parameters.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h6 className="font-medium">Parameter Definitions</h6>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="light"
                        onPress={() => {
                          const template = [
                            {
                              name: "id",
                              in: "path",
                              required: true,
                              description: "User ID",
                              schema: {
                                type: "string",
                                pattern: "^[0-9]+$"
                              },
                              example: "123"
                            },
                            {
                              name: "limit",
                              in: "query",
                              required: false,
                              description: "Number of items to return",
                              schema: {
                                type: "integer",
                                minimum: 1,
                                maximum: 100,
                                default: 10
                              },
                              example: 20
                            },
                            {
                              name: "Authorization",
                              in: "header",
                              required: true,
                              description: "Bearer token for authentication",
                              schema: {
                                type: "string",
                                pattern: "^Bearer .+"
                              },
                              example: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                            },
                            {
                              name: "sort",
                              in: "query",
                              required: false,
                              description: "Sort order",
                              schema: {
                                type: "string",
                                enum: ["asc", "desc"],
                                default: "asc"
                              },
                              example: "desc"
                            }
                          ];
                          setFormData(prev => ({ ...prev, parameters: JSON.stringify(template, null, 2) }));
                        }}
                      >
                        Use Template
                      </Button>
                    </div>
                  </div>

                  <div>
                    <EnhancedCodeEditor
                      value={formData.parameters}
                      onChange={(value) => setFormData(prev => ({ ...prev, parameters: value }))}
                      language="json"
                      height={350}
                      title="Parameter Definitions"
                      placeholder={`[
  {
    "name": "id",
    "in": "path",
    "required": true,
    "description": "User ID",
    "schema": {
      "type": "string",
      "pattern": "^[0-9]+$"
    },
    "example": "123"
  },
  {
    "name": "limit",
    "in": "query",
    "required": false,
    "description": "Number of items to return",
    "schema": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100,
      "default": 10
    },
    "example": 20
  },
  {
    "name": "Authorization",
    "in": "header",
    "required": true,
    "description": "Bearer token",
    "schema": {
      "type": "string"
    },
    "example": "Bearer your-token-here"
  }
]`}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                      <h6 className="font-medium mb-2">🎯 Parameter Locations:</h6>
                      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <li>• <strong>path:</strong> URL path segments (e.g., {'/users/{id}'})</li>
                        <li>• <strong>query:</strong> URL query parameters (?limit=10)</li>
                        <li>• <strong>header:</strong> HTTP headers (Authorization)</li>
                        <li>• <strong>cookie:</strong> Cookie parameters</li>
                      </ul>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                      <h6 className="font-medium mb-2">💡 Schema Tips:</h6>
                      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <li>• Use <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">pattern</code> for regex validation</li>
                        <li>• Use <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">enum</code> for allowed values</li>
                        <li>• Use <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">minimum/maximum</code> for numbers</li>
                        <li>• Use <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">default</code> for default values</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </Tab>

            <Tab key="request-body" title="Request Body">
              <div className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Define Request Body Schema</h5>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Define what data your API endpoint expects to receive. This will be used for validation and documentation.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">Content Type:</span>
                    <Chip size="sm" color="primary" variant="flat">application/json</Chip>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-sm font-medium">Request Body Schema (JSON Schema)</label>
                      <Button
                        size="sm"
                        variant="light"
                        onPress={() => {
                          const template = {
                            description: "Request body description",
                            required: true,
                            content: {
                              "application/json": {
                                schema: {
                                  type: "object",
                                  properties: {
                                    name: {
                                      type: "string",
                                      description: "User name",
                                      example: "John Doe"
                                    },
                                    email: {
                                      type: "string",
                                      format: "email",
                                      description: "User email address",
                                      example: "john@example.com"
                                    },
                                    age: {
                                      type: "integer",
                                      description: "User age",
                                      minimum: 0,
                                      example: 25
                                    }
                                  },
                                  required: ["name", "email"]
                                }
                              }
                            }
                          };
                          setFormData(prev => ({ ...prev, requestBody: JSON.stringify(template, null, 2) }));
                        }}
                      >
                        Use Template
                      </Button>
                    </div>

                    <EnhancedCodeEditor
                      value={formData.requestBody}
                      onChange={(value) => setFormData(prev => ({ ...prev, requestBody: value }))}
                      language="json"
                      height={300}
                      title="Request Body Schema"
                      placeholder={`{
  "description": "Request body description",
  "required": true,
  "content": {
    "application/json": {
      "schema": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "description": "User name",
            "example": "John Doe"
          },
          "email": {
            "type": "string",
            "format": "email",
            "description": "User email",
            "example": "john@example.com"
          }
        },
        "required": ["name", "email"]
      }
    }
  }
}`}
                    />
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <h6 className="font-medium mb-2">💡 Tips for Request Body Schema:</h6>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <li>• Use <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">type</code> to specify data types (string, number, object, array, boolean)</li>
                      <li>• Add <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">description</code> to explain each field</li>
                      <li>• Use <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">example</code> to provide sample values</li>
                      <li>• Set <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">required</code> array for mandatory fields</li>
                      <li>• Use <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">format</code> for validation (email, date, uuid, etc.)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </Tab>

            <Tab key="responses" title="Responses">
              <div className="space-y-6">
                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <h5 className="font-medium text-green-900 dark:text-green-100 mb-2">Define Response Schemas</h5>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Define what your API returns for different HTTP status codes. Include success and error responses.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h6 className="font-medium">Response Definitions</h6>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="light"
                        onPress={() => {
                          const template = {
                            "200": {
                              description: "Successful response",
                              schema: {
                                type: "object",
                                properties: {
                                  id: {
                                    type: "integer",
                                    description: "User ID",
                                    example: 123
                                  },
                                  name: {
                                    type: "string",
                                    description: "User name",
                                    example: "John Doe"
                                  },
                                  email: {
                                    type: "string",
                                    format: "email",
                                    description: "User email",
                                    example: "john@example.com"
                                  },
                                  createdAt: {
                                    type: "string",
                                    format: "date-time",
                                    description: "Creation timestamp",
                                    example: "2023-01-01T00:00:00Z"
                                  }
                                }
                              }
                            },
                            "400": {
                              description: "Bad request - validation error",
                              schema: {
                                type: "object",
                                properties: {
                                  error: {
                                    type: "string",
                                    example: "Validation failed"
                                  },
                                  details: {
                                    type: "array",
                                    items: {
                                      type: "string"
                                    },
                                    example: ["Email is required", "Name must be at least 2 characters"]
                                  }
                                }
                              }
                            },
                            "404": {
                              description: "Resource not found",
                              schema: {
                                type: "object",
                                properties: {
                                  error: {
                                    type: "string",
                                    example: "User not found"
                                  }
                                }
                              }
                            },
                            "500": {
                              description: "Internal server error",
                              schema: {
                                type: "object",
                                properties: {
                                  error: {
                                    type: "string",
                                    example: "Internal server error"
                                  }
                                }
                              }
                            }
                          };
                          setFormData(prev => ({ ...prev, responses: JSON.stringify(template, null, 2) }));
                        }}
                      >
                        Use Template
                      </Button>
                    </div>
                  </div>

                  <div>
                    <EnhancedCodeEditor
                      value={formData.responses}
                      onChange={(value) => setFormData(prev => ({ ...prev, responses: value }))}
                      language="json"
                      height={400}
                      title="Response Schemas"
                      placeholder={`{
  "200": {
    "description": "Successful response",
    "schema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "integer",
          "example": 123
        },
        "name": {
          "type": "string",
          "example": "John Doe"
        },
        "email": {
          "type": "string",
          "format": "email",
          "example": "john@example.com"
        }
      }
    }
  },
  "400": {
    "description": "Bad request",
    "schema": {
      "type": "object",
      "properties": {
        "error": {
          "type": "string",
          "example": "Validation failed"
        }
      }
    }
  },
  "404": {
    "description": "Not found",
    "schema": {
      "type": "object",
      "properties": {
        "error": {
          "type": "string",
          "example": "Resource not found"
        }
      }
    }
  }
}`}
                    />
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <h6 className="font-medium mb-2">💡 Tips for Response Schemas:</h6>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <li>• <strong>200-299:</strong> Success responses (200: OK, 201: Created, 204: No Content)</li>
                      <li>• <strong>400-499:</strong> Client errors (400: Bad Request, 401: Unauthorized, 404: Not Found)</li>
                      <li>• <strong>500-599:</strong> Server errors (500: Internal Server Error)</li>
                      <li>• Always include a <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">description</code> for each status code</li>
                      <li>• Add <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">examples</code> to show actual response values</li>
                    </ul>
                  </div>
                </div>
              </div>
            </Tab>

            <Tab key="security" title="Security">
              <div className="space-y-4">
                <h5 className="font-semibold">Security Requirements</h5>
                <Textarea
                  label="Security (JSON)"
                  placeholder='[{"type": "apiKey", "name": "Authorization", "in": "header"}]'
                  value={formData.security}
                  onChange={(e) => setFormData(prev => ({ ...prev, security: e.target.value }))}
                  minRows={6}
                  className="font-mono text-sm"
                />
              </div>
            </Tab>
          </Tabs>

          {/* Removed unused parameter/response/security modals - using enhanced code editors with templates instead */}
        </CardBody>
      </Card>
    );
  }

  if (!operation) {
    return (
      <Card className={`my-4 border-2 border-dashed border-gray-300 ${embedded ? 'shadow-sm' : 'shadow-md'}`}>
        <CardBody className="text-center py-8">
          <p className="text-gray-500">Loading operation...</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className={`my-4 ${embedded ? 'shadow-sm' : 'shadow-md'}`}>
      <CardHeader className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Chip
              color={getMethodColor(operation.method) as "default" | "primary" | "secondary" | "success" | "warning" | "danger"}
              size="sm"
              variant="flat"
            >
              {operation.method}
            </Chip>
            <Code className="text-sm">
              {operation.endpoint}
            </Code>
            {operation.deprecated && (
              <Chip color="danger" size="sm" variant="flat">
                DEPRECATED
              </Chip>
            )}
          </div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {operation.title}
          </h4>
          {operation.summary && (
            <p className="text-gray-600 dark:text-gray-400 mt-1 font-medium">
              {operation.summary}
            </p>
          )}
          {operation.description && (
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {operation.description}
            </p>
          )}
          {operation.tags && operation.tags.length > 0 && (
            <div className="flex gap-1 mt-2">
              {operation.tags.map((tag, index) => (
                <Chip key={index} size="sm" variant="bordered">
                  {tag}
                </Chip>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="light"
            size="sm"
            onPress={handleTest}
            isLoading={isTesting}
            startContent={<PlayIcon className="w-4 h-4" />}
          >
            Test
          </Button>
          <Button
            variant="light"
            size="sm"
            onPress={() => setIsEditing(true)}
            startContent={<PencilIcon className="w-4 h-4" />}
          >
            Edit
          </Button>
          {onRemove && (
            <Button
              color="danger"
              variant="light"
              size="sm"
              onPress={onRemove}
              isIconOnly
            >
              <XMarkIcon className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardBody>
        <Tabs className="w-full">
          {/* API Operations Overview Tab */}
          <Tab key="overview" title="Overview">
            <div className="space-y-6">
              {/* Operation Details */}
              <div className="space-y-4">
                <Accordion>
                  {/* Parameters Section */}
                  {operation.parameters && operation.parameters.length > 0 ? (
                    <AccordionItem
                      key="parameters"
                      title={
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Parameters</span>
                          <Chip size="sm" variant="flat">{operation.parameters.length}</Chip>
                        </div>
                      }
                    >
                      <div className="space-y-3">
                        {operation.parameters.map((param, index: number) => (
                          <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <div className="flex items-start gap-3 mb-2">
                              <Code size="sm" className="flex-shrink-0">{param.name}</Code>
                              <div className="flex gap-2 flex-wrap">
                                <Chip size="sm" variant="bordered">{param.in}</Chip>
                                {param.required && (
                                  <Chip size="sm" color="danger" variant="flat">Required</Chip>
                                )}
                                {param.schema?.type && (
                                  <Chip size="sm" color="secondary" variant="flat">{param.schema.type}</Chip>
                                )}
                              </div>
                            </div>
                            {param.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{param.description}</p>
                            )}
                            {param.schema && (
                              <div className="bg-gray-50 dark:bg-gray-900 rounded-md">
                                <EnhancedCodeEditor
                                  value={JSON.stringify(param.schema, null, 2)}
                                  readOnly
                                  language="json"
                                  height={100}
                                  allowCopy
                                  collapsible
                                  title={`${param.name} Schema`}
                                />
                              </div>
                            )}
                            {param.example !== undefined && (
                              <div className="mt-2">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Example:</p>
                                <Code size="sm">{typeof param.example === 'object' ? JSON.stringify(param.example) : String(param.example)}</Code>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </AccordionItem>
                  ) : null}

                  {/* Request Body Section */}
                  {(operation.requestSchema || (operation.method !== 'GET' && operation.method !== 'DELETE')) ? (
                    <AccordionItem
                      key="request-body"
                      title="Request Body"
                    >
                      <div className="space-y-4">
                        {operation.requestSchema ? (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <Chip size="sm" color="primary" variant="flat">application/json</Chip>
                            </div>
                            <EnhancedCodeEditor
                              value={JSON.stringify(operation.requestSchema, null, 2)}
                              readOnly
                              language="json"
                              height={200}
                              allowCopy
                              collapsible
                              title="Request Body Schema"
                            />
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <p>This operation accepts a request body.</p>
                            <p className="text-sm">Schema not defined. You can add it by editing this operation.</p>
                          </div>
                        )}
                      </div>
                    </AccordionItem>
                  ) : null}

                  {/* Responses Section */}
                  <AccordionItem
                    key="responses"
                    title={
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Responses</span>
                        {operation.responses && (
                          <Chip size="sm" variant="flat">{Object.keys(operation.responses).length}</Chip>
                        )}
                      </div>
                    }
                  >
                    <div className="space-y-4">
                      {operation.responses && Object.keys(operation.responses).length > 0 ? (
                        Object.entries(operation.responses).map(([statusCode, response]) => (
                          <div key={statusCode} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <div className="flex items-center gap-3 mb-3">
                              <Chip
                                size="sm"
                                color={
                                  statusCode.startsWith('2') ? 'success' :
                                  statusCode.startsWith('4') ? 'warning' :
                                  statusCode.startsWith('5') ? 'danger' : 'default'
                                }
                              >
                                {statusCode}
                              </Chip>
                              <span className="font-medium">{response.description || 'Response'}</span>
                            </div>

                            {response.schema && (
                              <div>
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="text-sm font-medium">Content Type:</span>
                                  <Chip size="sm" color="primary" variant="flat">application/json</Chip>
                                </div>
                                <EnhancedCodeEditor
                                  value={JSON.stringify(response.schema, null, 2)}
                                  readOnly
                                  language="json"
                                  height={150}
                                  allowCopy
                                  collapsible
                                  title={`Response ${statusCode} Schema`}
                                />
                              </div>
                            )}

                            {response.examples ? (
                              <div className="mt-4">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Examples:</p>
                                <EnhancedCodeEditor
                                  value={typeof response.examples === 'object' ? JSON.stringify(response.examples, null, 2) : String(response.examples)}
                                  readOnly
                                  language="json"
                                  height={100}
                                  allowCopy
                                  collapsible
                                  title="Response Examples"
                                />
                              </div>
                            ) : null}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          <p>No responses defined.</p>
                          <p className="text-sm">Add response definitions by editing this operation.</p>
                        </div>
                      )}
                    </div>
                  </AccordionItem>

                  {/* Security Section */}
                  {operation.security && operation.security.length > 0 ? (
                    <AccordionItem
                      key="security"
                      title={
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Security</span>
                          <Chip size="sm" variant="flat">{operation.security.length}</Chip>
                        </div>
                      }
                    >
                      <div className="space-y-3">
                        {operation.security.map((security, index: number) => (
                          <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <div className="flex items-center gap-3 mb-2">
                              <Chip color="secondary" size="sm">{security.type}</Chip>
                              {security.name && <Code size="sm">{security.name}</Code>}
                            </div>
                            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                              {security.in && <p><strong>Location:</strong> {security.in}</p>}
                              {security.scheme && <p><strong>Scheme:</strong> {security.scheme}</p>}
                              {security.bearerFormat && <p><strong>Bearer Format:</strong> {security.bearerFormat}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionItem>
                  ) : null}
                </Accordion>
              </div>
            </div>
          </Tab>

          {/* Advanced Test Interface */}
          <Tab key="test" title="Test API">
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <Chip
                      color={getMethodColor(operation.method) as "default" | "primary" | "secondary" | "success" | "warning" | "danger"}
                      size="sm"
                      variant="flat"
                    >
                      {operation.method}
                    </Chip>
                    <Code className="text-sm">{operation.endpoint}</Code>
                  </div>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300">{operation.summary || operation.title}</p>
              </div>

              <Tabs>
                <Tab key="request-config" title="Request">
                  <div className="space-y-6">
                    {/* Path Parameters */}
                    {(operation.parameters?.filter((p) => p.in === 'path').length || 0) > 0 && (
                      <div>
                        <h5 className="font-semibold mb-3 flex items-center gap-2">
                          Path Parameters
                          <Chip size="sm" color="danger" variant="flat">Required</Chip>
                        </h5>
                        <div className="space-y-3">
                          {operation.parameters
                            ?.filter((p) => p.in === 'path')
                            .map((param, index: number) => (
                              <div key={index}>
                                <Input
                                  label={param.name}
                                  description={param.description}
                                  placeholder={param.example ? String(param.example) : `Enter ${param.name}`}
                                  isRequired={param.required}
                                  value={String(testParameters[param.name] || '')}
                                  onChange={(e) => setTestParameters(prev => ({
                                    ...prev,
                                    [param.name]: e.target.value
                                  }))}
                                  startContent={<Code size="sm">{param.schema?.type || 'string'}</Code>}
                                />
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Query Parameters */}
                    {(operation.parameters?.filter((p) => p.in === 'query').length || 0) > 0 && (
                      <div>
                        <h5 className="font-semibold mb-3">Query Parameters</h5>
                        <div className="space-y-3">
                          {operation.parameters
                            ?.filter((p) => p.in === 'query')
                            .map((param, index: number) => (
                              <div key={index}>
                                <Input
                                  label={param.name}
                                  description={param.description}
                                  placeholder={param.example ? String(param.example) : `Enter ${param.name}`}
                                  isRequired={param.required}
                                  value={String(testParameters[param.name] || '')}
                                  onChange={(e) => setTestParameters(prev => ({
                                    ...prev,
                                    [param.name]: e.target.value
                                  }))}
                                  startContent={<Code size="sm">{param.schema?.type || 'string'}</Code>}
                                />
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Header Parameters */}
                    {(operation.parameters?.filter((p) => p.in === 'header').length || 0) > 0 && (
                      <div>
                        <h5 className="font-semibold mb-3">Headers</h5>
                        <div className="space-y-3">
                          {operation.parameters
                            ?.filter((p) => p.in === 'header')
                            .map((param, index: number) => (
                              <div key={index}>
                                <Input
                                  label={param.name}
                                  description={param.description}
                                  placeholder={param.example ? String(param.example) : `Enter ${param.name}`}
                                  isRequired={param.required}
                                  value={testHeaders[param.name] || ''}
                                  onChange={(e) => setTestHeaders(prev => ({
                                    ...prev,
                                    [param.name]: e.target.value
                                  }))}
                                />
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Request Body */}
                    {operation.method !== 'GET' && operation.method !== 'DELETE' && (
                      <div>
                        <h5 className="font-semibold mb-3">Request Body</h5>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Chip size="sm" color="primary" variant="flat">application/json</Chip>
                          </div>
                          <EnhancedCodeEditor
                            value={testRequestBody}
                            onChange={setTestRequestBody}
                            language="json"
                            height={200}
                            title="Request Body"
                            placeholder={operation.requestSchema ?
                              JSON.stringify(generateExampleFromSchema(operation.requestSchema), null, 2) :
                              '{\n  "key": "value"\n}'
                            }
                          />
                        </div>
                      </div>
                    )}

                    {/* Custom Headers */}
                    <div>
                      <h5 className="font-semibold mb-3">Additional Headers</h5>
                      <EnhancedCodeEditor
                        value={JSON.stringify({
                          "Content-Type": "application/json",
                          "Authorization": "Bearer your-token-here",
                          ...testHeaders
                        }, null, 2)}
                        onChange={(value) => {
                          try {
                            const parsed = JSON.parse(value);
                            setTestHeaders(parsed);
                          } catch {
                            // Invalid JSON, ignore
                          }
                        }}
                        language="json"
                        height={120}
                        title="Custom Headers"
                      />
                    </div>

                    {/* Send Request Button */}
                    <div className="pt-4 border-t">
                      <Button
                        color="primary"
                        size="lg"
                        onPress={handleTest}
                        isLoading={isTesting}
                        startContent={<PlayIcon className="w-4 h-4" />}
                        className="w-full"
                      >
                        {isTesting ? 'Sending Request...' : 'Send Request'}
                      </Button>
                    </div>
                  </div>
                </Tab>

                <Tab key="response-tab" title="Response">
                  <div className="space-y-4">
                    {testResult ? (
                      <div>
                        {/* Response Status */}
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-sm font-medium">Status:</span>
                            <Chip color={JSON.parse(testResult).status < 400 ? "success" : "danger"}>
                              {JSON.parse(testResult).status} {JSON.parse(testResult).statusText}
                            </Chip>
                          </div>
                        </div>

                        {/* Response Headers */}
                        <div className="mb-4">
                          <h6 className="font-medium mb-2">Response Headers</h6>
                          <EnhancedCodeEditor
                            value={JSON.stringify(JSON.parse(testResult).headers || {}, null, 2)}
                            readOnly
                            language="json"
                            height={100}
                            allowCopy
                            collapsible
                            title="Headers"
                          />
                        </div>

                        {/* Response Body */}
                        <div>
                          <h6 className="font-medium mb-2">Response Body</h6>
                          <EnhancedCodeEditor
                            value={typeof JSON.parse(testResult).body === 'object' ?
                              JSON.stringify(JSON.parse(testResult).body, null, 2) :
                              String(JSON.parse(testResult).body)
                            }
                            readOnly
                            language={typeof JSON.parse(testResult).body === 'object' ? "json" : "plaintext"}
                            height={300}
                            allowCopy
                            title="Response Body"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        <div className="text-4xl mb-4">📡</div>
                        <h4 className="text-lg font-semibold mb-2">No Response Yet</h4>
                        <p>Send a request to see the response here</p>
                      </div>
                    )}
                  </div>
                </Tab>
              </Tabs>
            </div>
          </Tab>
        </Tabs>
      </CardBody>
    </Card>
  );
};

export default OpenApiOperationBlock;