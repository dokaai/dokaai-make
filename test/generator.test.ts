import assert from 'node:assert/strict';
import test from 'node:test';
import { makeConfig } from '../src/config.js';
import { buildMakeApp } from '../src/index.js';
import { readOpenApiDocument } from '../src/scripts/read-openapi.js';

const app = buildMakeApp(readOpenApiDocument());

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
