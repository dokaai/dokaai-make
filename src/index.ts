import { buildAppManifest } from './make/app.js';
import { buildBase } from './make/base.js';
import {
  buildConnectionCommunication,
  buildConnectionParameters,
  connectionName,
} from './make/connection.js';
import { buildModules } from './make/modules.js';
import { buildRpcs } from './make/rpcs.js';
import type { OpenApiDocument } from './openapi/types.js';

export const buildMakeApp = (document: OpenApiDocument) => ({
  app: buildAppManifest(),
  base: buildBase(),
  connection: {
    name: connectionName,
    label: 'DokaAI API',
    parameters: buildConnectionParameters(),
    communication: buildConnectionCommunication(),
  },
  modules: buildModules(document),
  rpcs: buildRpcs(document),
});
