import { makeConfig } from '../config.js';
import type { MakeCommunication, MakeParameter } from './types.js';

export const connectionName = 'dokaai-api';

export const buildConnectionParameters = (): MakeParameter[] => [
  {
    name: 'clientKey',
    type: 'password',
    label: 'Client Key',
    required: true,
  },
  {
    name: 'clientSecret',
    type: 'password',
    label: 'Client Secret',
    required: true,
  },
];

export const buildConnectionCommunication = (): MakeCommunication => ({
  url: `${makeConfig.baseUrl}/opm/client-secrets/me`,
  method: 'GET',
  headers: {
    'x-client-key': '{{parameters.clientKey}}',
    'x-client-secret': '{{parameters.clientSecret}}',
  },
  response: {
    output: '{{body}}',
  },
  log: {
    sanitize: [
      'request.headers.x-client-key',
      'request.headers.x-client-secret',
    ],
  },
});
