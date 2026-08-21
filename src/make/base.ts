import { makeConfig } from '../config.js';
import type { MakeCommunication } from './types.js';

export const buildBase = (): MakeCommunication => ({
  baseUrl: makeConfig.baseUrl,
  headers: {
    'x-client-key': '{{connection.clientKey}}',
    'x-client-secret': '{{connection.clientSecret}}',
  },
  response: {
    error: {
      message:
        '[{{statusCode}}] {{ifempty(body.message, body.error.message, body.error, body)}}',
    },
  },
  log: {
    sanitize: [
      'request.headers.x-client-key',
      'request.headers.x-client-secret',
    ],
  },
} as MakeCommunication);
