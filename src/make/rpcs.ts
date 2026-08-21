import { makeConfig } from '../config.js';
import { findOperationById, makePathTemplate } from '../openapi/runtime.js';
import type { LocatedOperation, OpenApiDocument, OpenApiParameter } from '../openapi/types.js';
import type { MakeCommunication, MakeRpc } from './types.js';

interface RpcDefinition {
  name: string;
  label: string;
  operationId: string;
  staticPathParams?: Record<string, string>;
  staticQueryParams?: Record<string, string>;
}

export const rpcDefinitions: readonly RpcDefinition[] = [
  {
    name: 'listProjects',
    label: 'List Projects',
    operationId: 'getAllProjectsWithService',
    staticPathParams: {
      serviceId: makeConfig.serviceId,
    },
    staticQueryParams: {
      page: '1',
      size: '100',
    },
  },
  {
    name: 'listCustomerPools',
    label: 'List Customer Pools',
    operationId: 'getAllCustomerPoolInProject',
  },
  {
    name: 'listTargetAudienceLists',
    label: 'List Target Audience Lists',
    operationId: 'getTargetAudienceLists',
    staticQueryParams: {
      page: '1',
      size: '100',
    },
  },
  {
    name: 'listNotificationHandlers',
    label: 'List Notification Handlers',
    operationId: 'getAllNotificationHandlersInProject',
    staticQueryParams: {
      page: '1',
      size: '100',
    },
  },
  {
    name: 'listCustomerPoolAttributes',
    label: 'List Customer Pool Attributes',
    operationId: 'getPoolCustomerAttribute',
    staticQueryParams: {
      attributeTypes: 'custom',
      page: '1',
      size: '100',
    },
  },
];

const makeRpcPath = (
  path: string,
  staticPathParams: Record<string, string> | undefined,
): string =>
  path.replace(/\{([^}]+)\}/g, (_match, name: string) => {
    const staticValue = staticPathParams?.[name];

    return staticValue ?? `{{parameters.${name}}}`;
  });

const requiredPathParameters = (
  located: LocatedOperation,
  staticPathParams: Record<string, string> | undefined,
): string[] =>
  (located.operation.parameters ?? [])
    .filter((parameter) => parameter.in === 'path' && parameter.required !== false)
    .map((parameter) => parameter.name)
    .filter((name) => staticPathParams?.[name] === undefined);

const conditionForPathParams = (
  located: LocatedOperation,
  staticPathParams: Record<string, string> | undefined,
): string | undefined => {
  const params = requiredPathParameters(located, staticPathParams);

  if (params.length === 0) {
    return undefined;
  }

  return `{{${params.map((name) => `parameters.${name}`).join(' && ')}}}`;
};

const defaultQueryValue = (parameter: OpenApiParameter): string | undefined => {
  if (parameter.schema?.default !== undefined) {
    return String(parameter.schema.default);
  }

  if (parameter.name === 'page') {
    return '1';
  }

  if (parameter.name === 'size') {
    return '25';
  }

  if (parameter.name === 'attributeTypes') {
    return 'all';
  }

  return undefined;
};

const buildRequiredQueryDefaults = (
  located: LocatedOperation,
  staticQueryParams: Record<string, string> | undefined,
): Record<string, string> | undefined => {
  const entries = (located.operation.parameters ?? [])
    .filter((parameter) => parameter.in === 'query' && parameter.required === true)
    .map((parameter) => [
      parameter.name,
      staticQueryParams?.[parameter.name] ?? defaultQueryValue(parameter),
    ] as const)
    .filter((entry): entry is readonly [string, string] => entry[1] !== undefined);
  const merged = {
    ...(entries.length === 0 ? {} : Object.fromEntries(entries)),
    ...(staticQueryParams ?? {}),
  };

  return Object.keys(merged).length === 0 ? undefined : merged;
};

export const buildRpcs = (document: OpenApiDocument): MakeRpc[] =>
  rpcDefinitions.map((definition) => {
    const located = findOperationById(document, definition.operationId);

    if (located === undefined) {
      throw new Error(`Missing RPC operationId: ${definition.operationId}`);
    }

    const communication: MakeCommunication = {
      url: makeRpcPath(located.path, definition.staticPathParams),
      method: located.method.toUpperCase(),
      response: {
        limit: 500,
        iterate: '{{ifempty(body.data, body.items, body.results, body)}}',
        output: {
          label:
            '{{ifempty(item.name, item.projectName, item.customerPoolName, item.title, item.label, item.key, item.id)}}',
          value:
            '{{ifempty(item.id, item.projectId, item.customerPoolId, item.targetAudienceListId, item.notificationHandlerId, item.fieldName, item.key)}}',
        },
      },
    };
    const qs = buildRequiredQueryDefaults(located, definition.staticQueryParams);
    const condition = conditionForPathParams(located, definition.staticPathParams);

    if (qs !== undefined) {
      communication.qs = qs;
    }

    if (condition !== undefined) {
      communication.condition = condition;
    }

    return {
      name: definition.name,
      label: definition.label,
      communication,
    };
  });

export const rpcForField = (fieldName: string): string | undefined => {
  if (fieldName === 'projectId') {
    return 'listProjects';
  }

  if (fieldName === 'customerPoolId') {
    return 'listCustomerPools';
  }

  if (fieldName === 'targetAudienceListId' || fieldName === 'filterOutTALId') {
    return 'listTargetAudienceLists';
  }

  if (fieldName === 'notificationHandlerId') {
    return 'listNotificationHandlers';
  }

  return undefined;
};

export const toMakeRpcOptions = (fieldName: string): string | undefined => {
  const rpc = rpcForField(fieldName);

  return rpc === undefined ? undefined : `rpc://${rpc}`;
};
