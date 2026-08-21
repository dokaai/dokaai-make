import { selectedOperationIds } from '../make-operation-ids.js';
import { buildMakeApp } from '../index.js';
import { rpcDefinitions } from '../make/rpcs.js';
import { findOperationById } from '../openapi/runtime.js';
import { readOpenApiDocument } from './read-openapi.js';

const document = readOpenApiDocument();
const errors: string[] = [];
const seen = new Set<string>();

for (const operationId of selectedOperationIds) {
  if (seen.has(operationId)) {
    errors.push(`Duplicate selected operationId: ${operationId}`);
  }

  seen.add(operationId);

  if (findOperationById(document, operationId) === undefined) {
    errors.push(`Selected operationId does not exist: ${operationId}`);
  }
}

for (const rpc of rpcDefinitions) {
  const located = findOperationById(document, rpc.operationId);

  if (located === undefined) {
    continue;
  }

  const missingParams = (located.operation.parameters ?? [])
    .filter((parameter) => parameter.in === 'path' && parameter.required !== false)
    .map((parameter) => parameter.name)
    .filter((name) => rpc.staticPathParams?.[name] === undefined)
    .filter((name) => name !== 'projectId' && name !== 'customerPoolId');

  for (const name of missingParams) {
    errors.push(`RPC ${rpc.name} has unresolved path parameter: ${name}`);
  }
}

const app = buildMakeApp(document);
const moduleNames = new Set<string>();

for (const module of app.modules) {
  if (moduleNames.has(module.name)) {
    errors.push(`Duplicate generated module name: ${module.name}`);
  }

  moduleNames.add(module.name);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(
    `Make config is valid: ${app.modules.length} modules, ${app.rpcs.length} RPCs.`,
  );
}
