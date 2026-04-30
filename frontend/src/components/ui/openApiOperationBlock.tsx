import { useState, useEffect } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Tabs,
  Tab,
  Input,
  Select,
  SelectItem,
  Textarea
} from '@heroui/react';
import { PencilIcon, XMarkIcon, PlayIcon } from '@heroicons/react/24/outline';
import type { JsonSchema } from '../../types/docs';
import EnhancedCodeEditor from './enhancedCodeEditor';
import { performApiTest } from '../../utils/proxyRequest';

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

interface OpenApiOperation {
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: Parameter[];
  requestBody?: {
    description?: string;
    required?: boolean;
    content?: Record<string, {
      schema?: JsonSchema;
      example?: unknown;
    }>;
  };
  responses?: Record<string, {
    description?: string;
    content?: Record<string, {
      schema?: JsonSchema;
      example?: unknown;
    }>;
  }>;
  endpoint: string;
  method: string;
  headers?: Record<string, string>;
  tags?: string[];
}

interface OpenApiOperationBlockProps {
  operation?: OpenApiOperation;
  // Legacy props for compatibility with MarkdownRenderer
  method?: string;
  endpoint?: string;
  title?: string;
  summary?: string;
  description?: string;
  parameters?: Parameter[];
  responses?: any;
  tags?: string[];
  operationId_openapi?: string;
  deprecated?: boolean;
  security?: unknown[];
  pageId?: number;
  embedded?: boolean;
  onEdit?: (operation: OpenApiOperation) => void;
  canEdit?: boolean;
}

const OpenApiOperationBlock = ({ 
  operation: propOperation,
  method: propMethod,
  endpoint: propEndpoint,
  title: propTitle,
  summary: propSummary,
  description: propDescription,
  parameters: propParameters,
  responses: propResponses,
  tags: propTags,
  onEdit,
  canEdit 
}: OpenApiOperationBlockProps) => {
  // Combine props into a single operation object
  const initialOperation: OpenApiOperation = propOperation || {
    method: propMethod || 'GET',
    endpoint: propEndpoint || '',
    summary: propTitle || propSummary || '',
    description: propDescription || '',
    parameters: propParameters || [],
    responses: propResponses || {},
    tags: propTags || []
  };

  const [operation, setOperation] = useState<OpenApiOperation>(initialOperation);
  const [testParameters, setTestParameters] = useState<Record<string, unknown>>({});
  const [testRequestBody, setTestRequestBody] = useState<string>('{}');
  const [testResponse, setTestResponse] = useState<{
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
    data?: unknown;
    error?: string;
  } | null>(null);
  const [isTestLoading, setIsTestLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedOperation, setEditedOperation] = useState<OpenApiOperation>(initialOperation);

  useEffect(() => {
    setOperation(initialOperation);
    setEditedOperation(initialOperation);
  }, [propOperation, propMethod, propEndpoint, propTitle, propSummary, propDescription, propParameters, propResponses, propTags]);

  useEffect(() => {
    // Initialize test data from operation
    const initialParams: Record<string, unknown> = {};
    operation.parameters?.forEach(param => {
      if (param.example !== undefined) {
        initialParams[param.name] = param.example;
      }
    });
    setTestParameters(initialParams);

    // Initialize request body from example
    if (operation.requestBody?.content) {
      const firstContentType = Object.keys(operation.requestBody.content)[0];
      const example = operation.requestBody.content[firstContentType].example;
      if (example) {
        setTestRequestBody(JSON.stringify(example, null, 2));
      }
    }
  }, [operation]);

  const handleTest = async () => {
    setIsTestLoading(true);
    setTestResponse(null);

    try {
      const testHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...operation.headers
      };

      let testUrl = operation.endpoint;
      Object.entries(testParameters).forEach(([key, value]) => {
        testUrl = testUrl.replace(`{${key}}`, encodeURIComponent(String(value)));
      });

      const queryParams = new URLSearchParams();
      Object.entries(testParameters).forEach(([key, value]) => {
        if (value && !operation.endpoint.includes(`{${key}}`)) {
          queryParams.append(key, String(value));
        }
      });

      if (queryParams.toString()) {
        testUrl += `?${queryParams.toString()}`;
      }

      let requestBody = undefined;
      if (operation.method !== 'GET') {
        try {
          requestBody = JSON.parse(testRequestBody);
        } catch {
          requestBody = testRequestBody;
        }
      }

      const response = await performApiTest(
        testUrl,
        operation.method,
        testHeaders,
        requestBody
      );

      setTestResponse({
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
        error: response.error
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setTestResponse({
        error: errorMessage
      });
    } finally {
      setIsTestLoading(false);
    }
  };

  const handleSaveEdit = () => {
    onEdit?.(editedOperation);
    setIsEditing(false);
  };

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

  const renderJsonSchema = (schema: JsonSchema): React.ReactNode => {
    if (!schema) return null;

    if (schema.type === 'object' && schema.properties) {
      return (
        <div className="bg-gray-50 dark:bg-gray-900 rounded p-4 space-y-2">
          {Object.entries(schema.properties).map(([propName, propSchema]) => (
            <div key={propName} className="font-mono text-sm">
              <div className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400">"{propName}"</span>
                <span className="text-gray-500">:</span>
                <span className="text-purple-600 dark:text-purple-400">
                  {propSchema.type || 'any'}
                  {schema.required?.includes(propName) && <span className="text-red-500 ml-1">*</span>}
                </span>
              </div>
              {propSchema.description && (
                <div className="text-gray-500 text-xs ml-4 mt-1">// {propSchema.description}</div>
              )}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="bg-gray-50 dark:bg-gray-900 rounded p-4">
        <code className="text-sm">{schema.type || 'any'}</code>
        {schema.description && <span className="text-gray-500 ml-2 text-sm">// {schema.description}</span>}
      </div>
    );
  };

  if (isEditing) {
    return (
      <Card className="my-6 border-2 border-primary shadow-xl animate-in fade-in zoom-in duration-200">
        <CardHeader className="flex justify-between items-center bg-gray-50 dark:bg-gray-900 px-6 py-4">
          <h3 className="text-lg font-bold">Edit Operation</h3>
          <Button size="sm" variant="flat" color="danger" isIconOnly onPress={() => setIsEditing(false)}>
            <XMarkIcon className="w-5 h-5" />
          </Button>
        </CardHeader>
        <CardBody className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1">
              <Select
                label="Method"
                selectedKeys={[editedOperation.method]}
                onSelectionChange={(keys) => setEditedOperation({ ...editedOperation, method: Array.from(keys)[0] as string })}
              >
                <SelectItem key="GET">GET</SelectItem>
                <SelectItem key="POST">POST</SelectItem>
                <SelectItem key="PUT">PUT</SelectItem>
                <SelectItem key="PATCH">PATCH</SelectItem>
                <SelectItem key="DELETE">DELETE</SelectItem>
              </Select>
            </div>
            <div className="md:col-span-3">
              <Input
                label="Endpoint URL"
                value={editedOperation.endpoint}
                onChange={(e) => setEditedOperation({ ...editedOperation, endpoint: e.target.value })}
              />
            </div>
          </div>

          <Input
            label="Summary"
            value={editedOperation.summary}
            onChange={(e) => setEditedOperation({ ...editedOperation, summary: e.target.value })}
          />

          <Textarea
            label="Description"
            value={editedOperation.description}
            onChange={(e) => setEditedOperation({ ...editedOperation, description: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="flat" onPress={() => setIsEditing(false)}>Cancel</Button>
            <Button color="primary" onPress={handleSaveEdit}>Save Changes</Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="my-6 border border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md shadow-lg overflow-hidden group hover:shadow-xl transition-all duration-300">
      <CardHeader className="p-0">
        <div className="flex items-center justify-between p-4 bg-gray-50/80 dark:bg-gray-900/80 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center gap-3">
            <Chip 
              color={getMethodColor(operation.method) as any} 
              size="md" 
              variant="flat" 
              className="font-bold uppercase"
            >
              {operation.method}
            </Chip>
            <code className="text-sm font-mono bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-md text-gray-700 dark:text-gray-300">
              {operation.endpoint}
            </code>
          </div>
          {canEdit && (
            <Button 
              size="sm" 
              variant="flat" 
              isIconOnly 
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onPress={() => setIsEditing(true)}
            >
              <PencilIcon className="w-4 h-4" />
            </Button>
          )}
        </div>
        <div className="px-6 py-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {operation.summary || 'No summary'}
          </h3>
          {operation.description && (
            <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              {operation.description}
            </p>
          )}
        </div>
      </CardHeader>

      <CardBody className="p-6">
        <Tabs variant="underlined" classNames={{
          tabList: "gap-6 w-full relative rounded-none border-b border-divider",
          cursor: "w-full bg-primary",
          tab: "max-w-fit px-0 h-12",
          tabContent: "group-data-[selected=true]:text-primary font-semibold"
        }}>
          <Tab key="documentation" title="Documentation">
            <div className="py-6 space-y-8">
              {/* Parameters section */}
              {operation.parameters && operation.parameters.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-gray-500">Parameters</h4>
                  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50/50 dark:bg-gray-900/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">In</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white/50 dark:bg-black/20">
                        {operation.parameters.map((param, index) => (
                          <tr key={index} className="hover:bg-gray-50/50 dark:hover:bg-white/5">
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <code className="text-sm font-bold text-primary">{param.name}</code>
                                {param.required && <span className="text-red-500 font-bold">*</span>}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <Chip size="sm" variant="flat" color="secondary">{param.in}</Chip>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                              {param.description || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Request Body section */}
              {operation.requestBody && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-gray-500">Request Body</h4>
                  {operation.requestBody.content && Object.entries(operation.requestBody.content).map(([contentType, content]) => (
                    <div key={contentType} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-mono">Content-Type:</span>
                        <Chip size="sm" variant="dot">{contentType}</Chip>
                      </div>
                      {content.schema && renderJsonSchema(content.schema)}
                    </div>
                  ))}
                </div>
              )}

              {/* Responses section */}
              {operation.responses && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-gray-500">Responses</h4>
                  <div className="grid grid-cols-1 gap-4">
                    {Object.entries(operation.responses).map(([status, response]) => (
                      <div key={status} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-900/30 space-y-3">
                        <div className="flex items-center gap-3">
                          <Chip 
                            size="sm" 
                            color={status.startsWith('2') ? 'success' : status.startsWith('4') ? 'warning' : 'danger'} 
                            variant="flat"
                            className="font-bold"
                          >
                            {status}
                          </Chip>
                          <span className="text-sm font-medium">{response.description}</span>
                        </div>
                        {response.content && Object.entries(response.content).map(([contentType, content]) => (
                          <div key={contentType} className="mt-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                            <div className="text-xs text-gray-500 mb-2">{contentType}</div>
                            {content.schema && renderJsonSchema(content.schema)}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Tab>

          <Tab key="try-it" title="Try it out">
            <div className="py-6 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Request Config */}
                <div className="space-y-6">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                    Request Parameters
                  </h4>
                  <div className="space-y-4">
                    {operation.parameters?.map(param => (
                      <Input
                        key={param.name}
                        label={param.name}
                        placeholder={`Enter ${param.name}`}
                        variant="bordered"
                        value={String(testParameters[param.name] || '')}
                        onChange={(e) => setTestParameters({ ...testParameters, [param.name]: e.target.value })}
                        classNames={{
                          inputWrapper: "border-gray-200 dark:border-gray-700 hover:border-primary transition-colors",
                          label: "text-gray-500 font-medium"
                        }}
                      />
                    ))}
                    
                    {operation.requestBody && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-500">Request Body (JSON)</label>
                        <EnhancedCodeEditor
                          value={testRequestBody}
                          onChange={setTestRequestBody}
                          language="json"
                          height={300}
                        />
                      </div>
                    )}

                    <Button 
                      color="primary" 
                      className="w-full h-12 font-bold shadow-lg shadow-primary/20"
                      startContent={<PlayIcon className="w-5 h-5" />}
                      onPress={handleTest}
                      isLoading={isTestLoading}
                    >
                      Send Request
                    </Button>
                  </div>
                </div>

                {/* Test Result */}
                <div className="space-y-6">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-gray-500">Response</h4>
                  {testResponse ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                      {testResponse.error ? (
                        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                          <p className="text-red-600 dark:text-red-400 font-medium">{testResponse.error}</p>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <Chip 
                              color={(testResponse.status || 0) < 400 ? 'success' : 'danger'} 
                              variant="flat"
                              className="font-bold"
                            >
                              {testResponse.status} {testResponse.statusText}
                            </Chip>
                          </div>
                          <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                            <EnhancedCodeEditor
                              value={typeof testResponse.data === 'string' ? testResponse.data : JSON.stringify(testResponse.data, null, 2)}
                              readOnly
                              language="json"
                              height={450}
                              allowCopy
                            />
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl text-gray-400">
                      <PlayIcon className="w-12 h-12 mb-2 opacity-20" />
                      <p className="text-sm">Run a request to see the response</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Tab>
        </Tabs>
      </CardBody>
    </Card>
  );
};

export default OpenApiOperationBlock;