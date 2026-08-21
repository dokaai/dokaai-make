import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildMakeApp } from '../index.js';
import type { MakeModule, MakeRpc } from '../make/types.js';
import { readOpenApiDocument, repositoryRoot } from './read-openapi.js';

interface ApiErrorBody {
  message?: string;
  error?: string;
  detail?: string;
}

const loadDotEnv = (): void => {
  const envPath = resolve(repositoryRoot, '.env');

  if (!existsSync(envPath)) {
    return;
  }

  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();

    if (trimmed.length === 0 || trimmed.startsWith('#')) {
      continue;
    }

    const equalsIndex = trimmed.indexOf('=');

    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    const rawValue = trimmed.slice(equalsIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, '');

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
};

loadDotEnv();

const token = process.env.MAKE_API_TOKEN;
const zoneUrl = (process.env.MAKE_ZONE_URL ?? 'https://eu1.make.com').replace(
  /\/+$/,
  '',
);

if (token === undefined || token.trim().length === 0) {
  throw new Error('MAKE_API_TOKEN is required. Add it to .env or the shell environment.');
}

const app = buildMakeApp(readOpenApiDocument());
const apiBaseUrl = `${zoneUrl}/api/v2`;
const appName = app.app.name;
const appVersion = String(app.app.version);

const readErrorBody = async (response: Response): Promise<string> => {
  const text = await response.text();

  if (text.length === 0) {
    return response.statusText;
  }

  try {
    const body = JSON.parse(text) as ApiErrorBody;
    return body.message ?? body.error ?? body.detail ?? text;
  } catch {
    return text;
  }
};

const request = async <T>(
  method: string,
  path: string,
  body?: unknown,
  options: { allowNotFound?: boolean; contentType?: string } = {},
): Promise<T | undefined> => {
  const headers: Record<string, string> = {
    Authorization: `Token ${token}`,
    Accept: 'application/json',
  };

  if (body !== undefined) {
    headers['Content-Type'] = options.contentType ?? 'application/json';
  }

  const init: RequestInit = {
    method,
    headers,
  };

  if (body !== undefined) {
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, init);

  if (response.status === 404 && options.allowNotFound === true) {
    return undefined;
  }

  if (!response.ok) {
    throw new Error(
      `${method} ${path} failed with ${response.status}: ${await readErrorBody(response)}`,
    );
  }

  const text = await response.text();

  if (text.length === 0) {
    return undefined;
  }

  return JSON.parse(text) as T;
};

const createOrPatchApp = async (): Promise<void> => {
  const path = `/sdk/apps/${appName}/${appVersion}`;
  const existing = await request('GET', path, undefined, { allowNotFound: true });

  if (existing === undefined) {
    await request('POST', '/sdk/apps', {
      app: app.app,
    });
    console.log(`Created app ${appName} v${appVersion}.`);
  } else {
    await request('PATCH', path, app.app);
    console.log(`Updated app ${appName} v${appVersion}.`);
  }

  await request('POST', `/sdk/apps/${appName}/${appVersion}/private`);
};

const setBase = async (): Promise<void> => {
  await request('POST', `/sdk/apps/${appName}/${appVersion}/base`, app.base);
  console.log('Pushed Base.');
};

const createOrPatchConnection = async (): Promise<string> => {
  const list = await request<{
    appConnections?: { name: string; label?: string; type?: string }[];
  }>('GET', `/sdk/apps/${appName}/connections`);
  const existing = list?.appConnections?.find(
    (connection) =>
      connection.name === app.connection.name ||
      connection.label === app.connection.label,
  );
  const connectionName = existing?.name ?? app.connection.name;

  if (existing === undefined) {
    const created = await request<{
      appConnection?: { name: string };
    }>('POST', `/sdk/apps/${appName}/connections`, {
      name: app.connection.name,
      label: app.connection.label,
      type: 'other',
    });

    console.log(`Created connection ${created?.appConnection?.name ?? connectionName}.`);
  } else {
    await request('PATCH', `/sdk/apps/connections/${connectionName}`, {
      label: app.connection.label,
    });
    console.log(`Updated connection ${connectionName}.`);
  }

  await request(
    'PUT',
    `/sdk/apps/connections/${connectionName}/parameters`,
    app.connection.parameters,
  );
  await request(
    'PUT',
    `/sdk/apps/connections/${connectionName}/api`,
    app.connection.communication,
  );

  return connectionName;
};

const typeIdForModule = (module: MakeModule): number =>
  module.type === 'search' ? 9 : 4;

const createOrPatchModule = async (
  module: MakeModule,
  connectionName: string,
): Promise<void> => {
  const list = await request<{
    modules?: { name: string; label?: string }[];
    appModules?: { name: string; label?: string }[];
  }>('GET', `/sdk/apps/${appName}/${appVersion}/modules`);
  const modules = list?.modules ?? list?.appModules ?? [];
  const existing = modules.find((candidate) => candidate.name === module.name);
  const moduleBody = {
    name: module.name,
    typeId: typeIdForModule(module),
    label: module.label,
    description: module.description,
    connection: connectionName,
  };

  if (existing === undefined) {
    await request('POST', `/sdk/apps/${appName}/${appVersion}/modules`, moduleBody);
    console.log(`Created module ${module.name}.`);
  } else {
    await request(
      'PATCH',
      `/sdk/apps/${appName}/${appVersion}/modules/${module.name}`,
      moduleBody,
    );
    console.log(`Updated module ${module.name}.`);
  }

  await request(
    'PUT',
    `/sdk/apps/${appName}/${appVersion}/modules/${module.name}/expect`,
    module.expect,
  );
  await request(
    'PUT',
    `/sdk/apps/${appName}/${appVersion}/modules/${module.name}/interface`,
    module.interface,
  );
  await request(
    'PUT',
    `/sdk/apps/${appName}/${appVersion}/modules/${module.name}/api`,
    module.communication,
  );
};

const createOrPatchRpc = async (
  rpc: MakeRpc,
  connectionName: string,
): Promise<void> => {
  const list = await request<{
    rpcs?: { name: string; label?: string }[];
    appRpcs?: { name: string; label?: string }[];
  }>('GET', `/sdk/apps/${appName}/${appVersion}/rpcs`);
  const rpcs = list?.rpcs ?? list?.appRpcs ?? [];
  const existing = rpcs.find((candidate) => candidate.name === rpc.name);
  const rpcBody = {
    name: rpc.name,
    label: rpc.label,
    connection: connectionName,
  };

  if (existing === undefined) {
    await request('POST', `/sdk/apps/${appName}/${appVersion}/rpcs`, rpcBody);
    console.log(`Created RPC ${rpc.name}.`);
  } else {
    await request(
      'PATCH',
      `/sdk/apps/${appName}/${appVersion}/rpcs/${rpc.name}`,
      rpcBody,
    );
    console.log(`Updated RPC ${rpc.name}.`);
  }

  await request(
    'PUT',
    `/sdk/apps/${appName}/${appVersion}/rpcs/${rpc.name}/api`,
    rpc.communication,
  );
};

await createOrPatchApp();
await setBase();
const connectionName = await createOrPatchConnection();

for (const rpc of app.rpcs) {
  await createOrPatchRpc(rpc, connectionName);
}

for (const module of app.modules) {
  await createOrPatchModule(module, connectionName);
}

console.log(`Done. Open ${zoneUrl} and check Custom Apps > DokaAI.`);
