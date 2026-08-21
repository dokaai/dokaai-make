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
    name: 'listProjects',
    label: 'List Projects',
    operationId: 'getAllProjectsWithService',
    staticPathParams: {
      serviceId: makeConfig.serviceId,
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
  },
  {
    name: 'listNotificationHandlers',
    label: 'List Notification Handlers',
    operationId: 'getAllNotificationHandlersInProject',
  },
  {
    name: 'listCustomerPoolAttributes',
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
          output: {
            label:
              '{{ifempty(item.name, item.projectName, item.customerPoolName, item.title, item.label, item.key, item.id)}}',
            value:
              '{{ifempty(item.id, item.projectId, item.customerPoolId, item.targetAudienceListId, item.notificationHandlerId, item.fieldName, item.key)}}',
          },
        },
      },
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
