export const makeActionOperationIds = [
  'addCustomersToPool',
  'addCustomerCustomAttribute',
  'associateCustomerToTargetAudienceList',
  'deleteCustomerFromTargetAudienceList',
  'updateCustomerInPool',
  'removeCustomerFromPool',
  'triggerNotificationHandler',
] as const;

export const makeSearchOperationIds = [
  'getPoolCustomers',
  'getPoolCustomerById',
  'getNotificationHandler',
  'getAllNotificationHandlersInProject',
  'getNotificationHandlerByKey',
] as const;

export const makeRpcOperationIds = [
  'getAllProjectsWithService',
  'getAllCustomerPoolInProject',
  'getTargetAudienceLists',
  'getAllNotificationHandlersInProject',
  'getPoolCustomerAttribute',
] as const;

export const selectedOperationIds = Array.from(new Set([
  ...makeActionOperationIds,
  ...makeSearchOperationIds,
  ...makeRpcOperationIds,
])) as readonly string[];
