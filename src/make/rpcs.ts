import { makeConfig } from '../config.js';
import { findOperationById, makePathTemplate } from '../openapi/runtime.js';
import type { OpenApiDocument } from '../openapi/types.js';
import type { MakeRpc } from './types.js';

interface RpcDefinition {
  name: string;
  label: string;
  operationId: string;
  staticPathParams?: Record<string, string>;
}

export const rpcDefinitions: readonly RpcDefinition[] = [
  {
    name: 'list-projects',
    label: 'List Projects',
    operationId: 'getAllProjectsWithService',
    staticPathParams: {
      serviceId: makeConfig.serviceId,
    },
  },
  {
    name: 'list-customer-pools',
    label: 'List Customer Pools',
    operationId: 'getAllCustomerPoolInProject',
  },
  {
    name: 'list-target-audience-lists',
    label: 'List Target Audience Lists',
    operationId: 'getTargetAudienceLists',
  },
  {
    name: 'list-notification-handlers',
    label: 'List Notification Handlers',
    operationId: 'getAllNotificationHandlersInProject',
  },
  {
    name: 'list-customer-pool-attributes',
    label: 'List Customer Pool Attributes',
    operationId: 'getPoolCustomerAttribute',
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

export const buildRpcs = (document: OpenApiDocument): MakeRpc[] =>
  rpcDefinitions.map((definition) => {
    const located = findOperationById(document, definition.operationId);

    if (located === undefined) {
      throw new Error(`Missing RPC operationId: ${definition.operationId}`);
    }

    return {
      name: definition.name,
      label: definition.label,
      communication: {
        url: makeRpcPath(located.path, definition.staticPathParams),
        method: located.method.toUpperCase(),
        response: {
          iterate: '{{ifempty(body.data, body.items, body.results, body)}}',
          output: '{{item}}',
        },
      },
    };
  });

export const rpcForField = (fieldName: string): string | undefined => {
  if (fieldName === 'projectId') {
    return 'list-projects';
  }

  if (fieldName === 'customerPoolId') {
    return 'list-customer-pools';
  }

  if (fieldName === 'targetAudienceListId' || fieldName === 'filterOutTALId') {
    return 'list-target-audience-lists';
  }

  if (fieldName === 'notificationHandlerId') {
    return 'list-notification-handlers';
  }

  return undefined;
};

export const toMakeRpcOptions = (fieldName: string): string | undefined => {
  const rpc = rpcForField(fieldName);

  return rpc === undefined ? undefined : `rpc://${rpc}`;
};
