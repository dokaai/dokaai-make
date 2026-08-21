import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { OpenApiDocument } from '../openapi/types.js';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

export const readOpenApiDocument = (): OpenApiDocument => {
  const apiPath = resolve(rootDir, 'src/api/index.json');
  return JSON.parse(readFileSync(apiPath, 'utf8')) as OpenApiDocument;
};

export const repositoryRoot = rootDir;
