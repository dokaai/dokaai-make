import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildMakeApp } from '../index.js';
import { readOpenApiDocument, repositoryRoot } from './read-openapi.js';

const writeJson = (path: string, value: unknown): void => {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};

const outputRoot = resolve(repositoryRoot, 'generated');
const app = buildMakeApp(readOpenApiDocument());

rmSync(outputRoot, { force: true, recursive: true });
mkdirSync(resolve(outputRoot, 'connections'), { recursive: true });
mkdirSync(resolve(outputRoot, 'modules'), { recursive: true });
mkdirSync(resolve(outputRoot, 'rpcs'), { recursive: true });

writeJson(resolve(outputRoot, 'app.json'), app.app);
writeJson(resolve(outputRoot, 'base.jsonc'), app.base);
writeJson(
  resolve(outputRoot, 'connections', `${app.connection.name}.jsonc`),
  app.connection,
);

for (const module of app.modules) {
  writeJson(resolve(outputRoot, 'modules', `${module.name}.jsonc`), module);
}

for (const rpc of app.rpcs) {
  writeJson(resolve(outputRoot, 'rpcs', `${rpc.name}.jsonc`), rpc);
}

console.log(
  `Generated Make app: ${app.modules.length} modules, ${app.rpcs.length} RPCs.`,
);
