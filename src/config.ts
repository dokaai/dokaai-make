export const makeConfig = {
  appName: process.env.MAKE_APP_NAME ?? 'dokaai',
  appLabel: 'DokaAI',
  appVersion: 1,
  appDescription:
    'Customer engagement, notification, and audience automation for DokaAI.',
  makeZoneUrl: process.env.MAKE_ZONE_URL ?? 'https://eu1.make.com',
  serviceId:
    process.env.DOKAAI_SERVICE_ID ?? 'f72c921b-0ad0-4387-8ac8-9ff8467d77cc',
  baseUrl: 'https://api.dokaai.com/v1/dokaai',
  private: true,
} as const;
