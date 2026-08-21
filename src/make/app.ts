import { makeConfig } from '../config.js';

export const buildAppManifest = () => ({
  name: makeConfig.appName,
  label: makeConfig.appLabel,
  version: makeConfig.appVersion,
  description: makeConfig.appDescription,
  language: 'en',
  visibility: makeConfig.private ? 'private' : 'public',
});
