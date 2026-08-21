export type MakeParameterType =
  | 'text'
  | 'password'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'date'
  | 'select'
  | 'array'
  | 'collection';

export interface MakeOption {
  label: string;
  value: string;
}

export interface MakeParameter {
  name: string;
  type: MakeParameterType;
  label: string;
  required?: boolean;
  help?: string;
  spec?: MakeParameter[];
  options?: MakeOption[] | string;
  default?: unknown;
}

export interface MakeCommunication {
  url?: string;
  baseUrl?: string;
  method?: string;
  qs?: Record<string, string>;
  headers?: Record<string, string>;
  body?: unknown;
  type?: string;
  condition?: string | boolean;
  response?: {
    limit?: number;
    iterate?: string;
    output?: unknown;
    error?: Record<string, unknown>;
  };
  log?: {
    sanitize: string[];
  };
}

export interface MakeModule {
  name: string;
  label: string;
  description: string;
  type: 'action' | 'search';
  connection: string;
  expect: MakeParameter[];
  interface: MakeParameter[];
  communication: MakeCommunication;
}

export interface MakeRpc {
  name: string;
  label: string;
  communication: MakeCommunication;
}
