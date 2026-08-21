export type HttpMethod =
  | 'get'
  | 'post'
  | 'put'
  | 'patch'
  | 'delete'
  | 'options'
  | 'head';

export interface JsonSchema {
  type?: string | readonly string[];
  format?: string;
  title?: string;
  description?: string;
  enum?: readonly unknown[];
  required?: readonly string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  anyOf?: readonly JsonSchema[];
  oneOf?: readonly JsonSchema[];
  allOf?: readonly JsonSchema[];
  additionalProperties?: boolean | JsonSchema;
}

export interface OpenApiParameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required?: boolean;
  description?: string;
  schema?: JsonSchema;
}

export interface OpenApiOperation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: readonly string[];
  parameters?: readonly OpenApiParameter[];
  requestBody?: {
    required?: boolean;
    content?: Record<string, { schema?: JsonSchema }>;
  };
  responses?: Record<string, { content?: Record<string, { schema?: JsonSchema }> }>;
}

export type OpenApiPathItem = Partial<Record<HttpMethod, OpenApiOperation>>;

export interface OpenApiDocument {
  openapi: string;
  servers?: readonly { url: string; description?: string }[];
  paths: Record<string, OpenApiPathItem>;
  components?: {
    securitySchemes?: Record<string, Record<string, unknown>>;
  };
  security?: readonly Record<string, readonly string[]>[];
}

export interface LocatedOperation {
  method: HttpMethod;
  path: string;
  operation: OpenApiOperation;
}
