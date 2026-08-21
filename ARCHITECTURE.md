# Architecture

## Source Of Truth

`src/api/index.json` is the source of truth for the Make app.

It owns:

- API server URL
- authentication schemes
- paths and HTTP methods
- path parameters
- query parameters
- request body schemas
- response schemas

TypeScript code should not contain per-endpoint route builders or per-operation
payload builders for normal REST operations.

## Runtime Flow

```text
src/scripts/build-app.ts
  -> read src/api/index.json
  -> build app manifest
  -> build Base
  -> build Connection
  -> build modules from selected operationIds
  -> build RPCs for dynamic Make fields
  -> write generated Make JSONC sections
```

## File Responsibilities

`src/make-operation-ids.ts` owns the selected Make module and RPC operation IDs.

`src/openapi/runtime.ts` locates OpenAPI operations and renders Make URL
templates.

`src/openapi/schema.ts` normalizes JSON Schema for Make parameter generation.

`src/make/base.ts` owns inherited DokaAI base URL, auth headers, response error
handling, and log sanitization.

`src/make/connection.ts` owns the DokaAI client key/client secret connection.

`src/make/modules.ts` generates Make action and search modules.

`src/make/rpcs.ts` generates Make RPC definitions for dynamic dropdowns.

## Dynamic Behavior

- `projectId` loads from `getAllProjectsWithService` using service ID
  `f72c921b-0ad0-4387-8ac8-9ff8467d77cc`.
- `customerPoolId` loads from `getAllCustomerPoolInProject`.
- `targetAudienceListId` and `filterOutTALId` load from
  `getTargetAudienceLists`.
- `notificationHandlerId` loads from `getAllNotificationHandlersInProject`.
- Customer pool attributes load from `getPoolCustomerAttribute`.

## Testing Strategy

Tests verify generated behavior without external API calls:

- selected operation IDs exist
- generated module and RPC counts are stable
- DokaAI credential headers are configured and sanitized
- project RPC uses the confirmed service ID
- DokaAI `PATCH` operations remain `PATCH`
