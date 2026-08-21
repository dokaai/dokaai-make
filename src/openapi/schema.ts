import type { JsonSchema } from './types.js';

export const normalizeSchema = (schema: JsonSchema | undefined): JsonSchema => {
  if (schema === undefined) {
    return {};
  }

  const union = schema.anyOf ?? schema.oneOf;
  const firstNonNull = union?.find((part) => {
    if (typeof part.type === 'string') {
      return part.type !== 'null';
    }

    return Array.isArray(part.type)
      ? part.type.some((type) => type !== 'null')
      : true;
  });

  if (firstNonNull !== undefined) {
    return normalizeSchema(firstNonNull);
  }

  if (schema.allOf === undefined) {
    return schema;
  }

  const schemaWithoutAllOf: JsonSchema = { ...schema };
  delete schemaWithoutAllOf.allOf;

  return schema.allOf.reduce<JsonSchema>(
    (merged, part) => {
      const normalized = normalizeSchema(part);

      return {
        ...merged,
        ...normalized,
        required: [...(merged.required ?? []), ...(normalized.required ?? [])],
        properties: {
          ...(merged.properties ?? {}),
          ...(normalized.properties ?? {}),
        },
      };
    },
    schemaWithoutAllOf,
  );
};

export const readSchemaType = (schema: JsonSchema): string | undefined => {
  if (typeof schema.type === 'string') {
    return schema.type;
  }

  return schema.type?.find((type) => type !== 'null');
};

export const getJsonRequestSchema = (
  requestBody: { content?: Record<string, { schema?: JsonSchema }> } | undefined,
): JsonSchema | undefined =>
  requestBody?.content?.['application/json']?.schema ??
  Object.values(requestBody?.content ?? {})[0]?.schema;

export const getSuccessResponseSchema = (
  responses: Record<string, { content?: Record<string, { schema?: JsonSchema }> }> | undefined,
): JsonSchema | undefined => {
  const success = Object.entries(responses ?? {}).find(([status]) =>
    status.startsWith('2'),
  )?.[1];

  return (
    success?.content?.['application/json']?.schema ??
    Object.values(success?.content ?? {})[0]?.schema
  );
};
