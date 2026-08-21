import { normalizeSchema, readSchemaType } from '../openapi/schema.js';
import type { JsonSchema, OpenApiParameter } from '../openapi/types.js';
import type { MakeParameter, MakeParameterType } from './types.js';
import { humanize } from './names.js';

export const backendOwnedFields = new Set([
  'organizationId',
  'createdById',
  'createdDate',
  'modifiedById',
  'modifiedDate',
  'isActive',
  'isDeleted',
]);

const mapType = (schema: JsonSchema): MakeParameterType => {
  const type = readSchemaType(schema);

  if (schema.format === 'date-time' || schema.format === 'date') {
    return 'date';
  }

  if (type === 'integer') {
    return 'integer';
  }

  if (type === 'number') {
    return 'number';
  }

  if (type === 'boolean') {
    return 'boolean';
  }

  if (type === 'array') {
    return 'array';
  }

  if (type === 'object' || schema.properties !== undefined) {
    return 'collection';
  }

  return 'text';
};

export const buildParameterFromSchema = (
  name: string,
  schema: JsonSchema | undefined,
  required: boolean,
): MakeParameter => {
  const normalized = normalizeSchema(schema);
  const type = mapType(normalized);
  const field: MakeParameter = {
    name,
    type,
    label: normalized.title ?? humanize(name),
    required,
  };

  if (normalized.description !== undefined) {
    field.help = normalized.description;
  }

  if (normalized.default !== undefined) {
    field.default = normalized.default;
  }

  if (normalized.enum !== undefined) {
    field.type = 'select';
    field.options = normalized.enum
      .filter((choice): choice is string => typeof choice === 'string')
      .map((choice) => ({ label: humanize(choice), value: choice }));
  }

  if (type === 'collection') {
    field.spec = buildParametersFromObjectSchema(normalized);
  }

  if (type === 'array') {
    const itemSchema = normalizeSchema(normalized.items);
    field.spec =
      readSchemaType(itemSchema) === 'object' || itemSchema.properties !== undefined
        ? buildParametersFromObjectSchema(itemSchema)
        : [buildParameterFromSchema('value', itemSchema, false)];
  }

  return field;
};

export const buildParametersFromObjectSchema = (
  schema: JsonSchema | undefined,
  excluded: ReadonlySet<string> = backendOwnedFields,
): MakeParameter[] => {
  const normalized = normalizeSchema(schema);
  const required = new Set(normalized.required ?? []);

  return Object.entries(normalized.properties ?? {})
    .filter(([name]) => !excluded.has(name))
    .map(([name, property]) =>
      buildParameterFromSchema(name, property, required.has(name)),
    );
};

export const buildParametersFromOpenApiParams = (
  parameters: readonly OpenApiParameter[] | undefined,
  location: OpenApiParameter['in'],
): MakeParameter[] =>
  (parameters ?? [])
    .filter((parameter) => parameter.in === location)
    .map((parameter) =>
      buildParameterFromSchema(
        parameter.name,
        parameter.schema,
        parameter.required === true || parameter.in === 'path',
      ),
    );
