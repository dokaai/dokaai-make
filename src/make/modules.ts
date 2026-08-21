import { makeActionOperationIds, makeSearchOperationIds } from '../make-operation-ids.js';
import { findOperationById, makePathTemplate } from '../openapi/runtime.js';
import {
  getJsonRequestSchema,
  getSuccessResponseSchema,
  normalizeSchema,
  readSchemaType,
} from '../openapi/schema.js';
import type { LocatedOperation, OpenApiDocument } from '../openapi/types.js';
import { buildParametersFromObjectSchema, buildParametersFromOpenApiParams } from './fields.js';
import { connectionName } from './connection.js';
import { sentenceLabel } from './names.js';
import { toMakeRpcOptions } from './rpcs.js';
import type { MakeCommunication, MakeModule, MakeParameter } from './types.js';

const pathParameterNames = (located: LocatedOperation): string[] =>
  (located.operation.parameters ?? [])
    .filter((parameter) => parameter.in === 'path')
    .map((parameter) => parameter.name);

const queryParameters = (located: LocatedOperation): MakeParameter[] =>
  buildParametersFromOpenApiParams(located.operation.parameters, 'query');

const pathParameters = (located: LocatedOperation): MakeParameter[] =>
  buildParametersFromOpenApiParams(located.operation.parameters, 'path');

const bodyParameters = (located: LocatedOperation): MakeParameter[] => {
  const schema = getJsonRequestSchema(located.operation.requestBody);
  const excluded = new Set([
    ...pathParameterNames(located),
    'organizationId',
    'projectId',
    'createdById',
    'createdDate',
    'modifiedById',
    'modifiedDate',
    'isActive',
    'isDeleted',
  ]);

  return buildParametersFromObjectSchema(schema, excluded);
};

const fieldPriority = (field: MakeParameter): number => {
  if (field.name === 'projectId') {
    return 0;
  }

  if (field.name === 'customerPoolId') {
    return 1;
  }

  if (field.name === 'targetAudienceListId' || field.name === 'filterOutTALId') {
    return 2;
  }

  if (field.name === 'notificationHandlerId') {
    return 3;
  }

  return 10;
};

const applyDynamicOptions = (field: MakeParameter): MakeParameter => {
  const options = toMakeRpcOptions(field.name);
  const next = { ...field };

  if (options !== undefined) {
    next.type = 'select';
    next.options = {
      store: options,
    };
  }

  if (field.spec !== undefined) {
    next.spec = field.spec.map(applyDynamicOptions);
  }

  return next;
};

const nestedUnderProjectId = new Set([
  'customerPoolId',
  'targetAudienceListId',
  'filterOutTALId',
  'notificationHandlerId',
]);

const customerAttributeOperationIds = new Set([
  'addCustomersToPool',
  'updateCustomerInPool',
]);

const storeOptions = (
  options: MakeParameter['options'],
): MakeParameter['options'] => {
  if (typeof options === 'string' || Array.isArray(options)) {
    return { store: options };
  }

  return options;
};

const nestDependentDynamicFields = (
  fields: MakeParameter[],
  operationId: string,
): MakeParameter[] => {
  const projectField = fields.find((field) => field.name === 'projectId');

  if (projectField === undefined) {
    return fields;
  }

  const nested = fields
    .filter((field) => nestedUnderProjectId.has(field.name))
    .map((field) => {
      if (
        field.name !== 'customerPoolId' ||
        !supportsCustomerAttributes(operationId)
      ) {
        return field;
      }

      const options = storeOptions(field.options);

      if (
        options === undefined ||
        typeof options === 'string' ||
        Array.isArray(options)
      ) {
        return field;
      }

      return {
        ...field,
        options: {
          ...options,
          nested: [
            ...(Array.isArray(options.nested) ? options.nested : []),
            'rpc://listCustomerPoolAttributes',
          ],
        },
      };
    });

  if (nested.length === 0) {
    return fields;
  }

  return fields
    .filter((field) => !nestedUnderProjectId.has(field.name))
    .map((field) => {
      if (field.name !== 'projectId') {
        return field;
      }

      const options = storeOptions(field.options);

      if (
        options === undefined ||
        typeof options === 'string' ||
        Array.isArray(options)
      ) {
        return field;
      }

      return {
        ...field,
        options: {
          ...options,
          nested,
        },
      };
    });
};

const supportsCustomerAttributes = (operationId: string): boolean =>
  customerAttributeOperationIds.has(operationId);

const buildBody = (located: LocatedOperation): unknown => {
  if (located.method === 'get' || located.method === 'head') {
    return undefined;
  }

  const omitted = [...pathParameterNames(located), ...queryParameters(located).map((field) => field.name)];

  return `{{omit(parameters, ${omitted.map((name) => `'${name}'`).join(', ')})}}`;
};

const buildQs = (located: LocatedOperation): Record<string, string> | undefined => {
  const params = queryParameters(located);

  if (params.length === 0) {
    return undefined;
  }

  return Object.fromEntries(
    params.map((parameter) => [parameter.name, `{{parameters.${parameter.name}}}`]),
  );
};

const inferIteratePath = (located: LocatedOperation): string | undefined => {
  const responseSchema = normalizeSchema(getSuccessResponseSchema(located.operation.responses));
  const type = readSchemaType(responseSchema);

  if (type === 'array') {
    return '{{body}}';
  }

  const properties = responseSchema.properties ?? {};

  for (const key of ['data', 'items', 'results']) {
    const property = normalizeSchema(properties[key]);

    if (readSchemaType(property) === 'array') {
      return `{{body.${key}}}`;
    }
  }

  return undefined;
};

const buildCommunication = (
  located: LocatedOperation,
  type: MakeModule['type'],
): MakeCommunication => {
  const communication: MakeCommunication = {
    url: makePathTemplate(located.path),
    method: located.method.toUpperCase(),
    response: {
      output: '{{body}}',
    },
  };

  const qs = buildQs(located);
  const body = buildBody(located);

  if (qs !== undefined) {
    communication.qs = qs;
  }

  if (body !== undefined) {
    communication.body = body;
    communication.type = 'json';
  }

  if (type === 'search') {
    communication.response = {
      iterate: inferIteratePath(located) ?? '{{ifempty(body.data, body.items, body.results, body)}}',
      output: '{{item}}',
    };
  }

  return communication;
};

const buildModule = (
  document: OpenApiDocument,
  operationId: string,
  type: MakeModule['type'],
): MakeModule => {
  const located = findOperationById(document, operationId);

  if (located === undefined) {
    throw new Error(`Missing module operationId: ${operationId}`);
  }

  const expect = [
    ...pathParameters(located),
    ...queryParameters(located),
    ...bodyParameters(located),
  ]
    .map(applyDynamicOptions)
    .sort((a, b) => fieldPriority(a) - fieldPriority(b));
  const nestedExpect = nestDependentDynamicFields(expect, operationId);

  return {
    name: operationId,
    label: sentenceLabel(located.operation.summary ?? operationId),
    description: located.operation.description ?? located.operation.summary ?? operationId,
    type,
    connection: connectionName,
    expect: nestedExpect,
    interface: [],
    communication: buildCommunication(located, type),
  };
};

export const buildModules = (document: OpenApiDocument): MakeModule[] => [
  ...makeActionOperationIds.map((operationId) =>
    buildModule(document, operationId, 'action'),
  ),
  ...makeSearchOperationIds.map((operationId) =>
    buildModule(document, operationId, 'search'),
  ),
];
