import assert from 'node:assert/strict';
import test from 'node:test';
import { makeConfig } from '../src/config.js';
import { buildMakeApp } from '../src/index.js';
import type { MakeParameter } from '../src/make/types.js';
import { readOpenApiDocument } from '../src/scripts/read-openapi.js';

const app = buildMakeApp(readOpenApiDocument());

const isParameter = (value: MakeParameter | string): value is MakeParameter =>
  typeof value !== 'string';

const nestedParameters = (field: MakeParameter): Array<MakeParameter | string> =>
  typeof field.options === 'object' &&
  !Array.isArray(field.options) &&
  Array.isArray(field.options.nested)
    ? field.options.nested
    : [];

test('uses the configured Make app identity', () => {
  assert.equal(app.app.name, process.env.MAKE_APP_NAME ?? 'dokaai');
  assert.equal(app.app.visibility, 'private');
});

test('generates the expected first-pass module and RPC counts', () => {
  assert.equal(app.modules.length, 12);
  assert.equal(app.rpcs.length, 5);
});

test('uses DokaAI client-key headers and sanitizes them', () => {
  assert.equal(app.base.headers?.['x-client-key'], '{{connection.clientKey}}');
  assert.equal(app.base.headers?.['x-client-secret'], '{{connection.clientSecret}}');
  assert.deepEqual(app.base.log?.sanitize, [
    'request.headers.x-client-key',
    'request.headers.x-client-secret',
  ]);
});

test('injects the confirmed service ID into the projects RPC', () => {
  const projectsRpc = app.rpcs.find((rpc) => rpc.name === 'listProjects');

  assert.ok(projectsRpc);
  const url = projectsRpc.communication.url;
  assert.ok(url);
  assert.match(url, new RegExp(makeConfig.serviceId));
});

test('preserves PATCH for DokaAI patch operations', () => {
  const module = app.modules.find(
    (candidate) => candidate.name === 'deleteCustomerFromTargetAudienceList',
  );

  assert.ok(module);
  assert.equal(module.communication.method, 'PATCH');
});

test('matches n8n and Zapier dynamic loader query policies', () => {
  const projectsRpc = app.rpcs.find((rpc) => rpc.name === 'listProjects');
  const attributesRpc = app.rpcs.find(
    (rpc) => rpc.name === 'listCustomerPoolAttributes',
  );

  assert.ok(projectsRpc);
  assert.deepEqual(projectsRpc.communication.qs, {
    page: '1',
    size: '100',
  });

  assert.ok(attributesRpc);
  assert.deepEqual(attributesRpc.communication.qs, {
    attributeTypes: 'custom',
    page: '1',
    size: '100',
  });
});

test('nests dependent Make RPC fields under projectId', () => {
  const module = app.modules.find(
    (candidate) => candidate.name === 'getPoolCustomers',
  );

  assert.ok(module);
  const projectField = module.expect
    .filter(isParameter)
    .find((field) => field.name === 'projectId');
  const customerPoolAtRoot = module.expect.find(
    (field) => isParameter(field) && field.name === 'customerPoolId',
  );

  assert.ok(projectField);
  assert.equal(customerPoolAtRoot, undefined);
  assert.equal(
    typeof projectField.options === 'object' &&
      !Array.isArray(projectField.options) &&
      nestedParameters(projectField).some(
        (field) => isParameter(field) && field.name === 'customerPoolId',
      ),
    true,
  );
});

test('nests customer attribute dynamic fields under customerPoolId', () => {
  const module = app.modules.find(
    (candidate) => candidate.name === 'addCustomersToPool',
  );

  assert.ok(module);
  const projectField = module.expect
    .filter(isParameter)
    .find((field) => field.name === 'projectId');

  assert.ok(projectField);
  assert.equal(
    typeof projectField.options === 'object' &&
      !Array.isArray(projectField.options) &&
      nestedParameters(projectField)
        ?.filter(isParameter)
        .find((field) => field.name === 'customerPoolId')
        ?.options !== undefined,
    true,
  );

  const customerPoolField =
    typeof projectField.options === 'object' &&
    !Array.isArray(projectField.options)
      ? nestedParameters(projectField)
          ?.filter(isParameter)
          .find((field) => field.name === 'customerPoolId')
      : undefined;

  assert.equal(
    typeof customerPoolField?.options === 'object' &&
      !Array.isArray(customerPoolField.options) &&
      customerPoolField.options?.nested?.includes(
        'rpc://listCustomerPoolAttributes',
      ),
    true,
  );
  assert.equal(module.expect.includes('rpc://listCustomerPoolAttributes'), false);
});
