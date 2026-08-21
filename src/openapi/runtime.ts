import type {
  HttpMethod,
  LocatedOperation,
  OpenApiDocument,
} from './types.js';

export const httpMethods: readonly HttpMethod[] = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'options',
  'head',
];

export const findOperationById = (
  document: OpenApiDocument,
  operationId: string,
): LocatedOperation | undefined => {
  for (const [path, pathItem] of Object.entries(document.paths)) {
    for (const method of httpMethods) {
      const operation = pathItem[method];

      if (operation?.operationId === operationId) {
        return { method, path, operation };
      }
    }
  }

  return undefined;
};

export const makePathTemplate = (path: string): string =>
  path.replace(/\{([^}]+)\}/g, (_match, name: string) => {
    return `{{parameters.${name}}}`;
  });
