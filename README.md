# DokaAI Make Integration

Make custom app generator for DokaAI.

The app is generated from `src/api/index.json`, the same DokaAI OpenAPI contract
used by the n8n and Zapier integrations. Normal REST operations should be added
by selecting OpenAPI `operationId`s, not by hand-writing one-off Make modules.

## Current Defaults

- Make zone: `https://eu1.make.com`
- Visibility: private
- Default DokaAI app name: `dokaai`
- Existing Make UI-created app name can be supplied with `MAKE_APP_NAME`.
- DokaAI project dropdown service ID:
  `f72c921b-0ad0-4387-8ac8-9ff8467d77cc`

## Commands

```bash
npm install
npm run check
npm run generate
```

Generated Make app sections are written to `generated/`.

## Environment

```text
MAKE_API_TOKEN=
MAKE_ZONE_URL=https://eu1.make.com
MAKE_APP_NAME=dokaai-app-76ss12
DOKAAI_SERVICE_ID=f72c921b-0ad0-4387-8ac8-9ff8467d77cc
```

The first implementation generates local JSONC sections. A later deployment
script should use `MAKE_API_TOKEN` with Make SDK Apps API scopes
`sdk-apps:read` and `sdk-apps:write`.

## Supported Modules

Actions:

- Add customers to pool
- Add customer custom attribute
- Associate customer to target audience list
- Delete customer from target audience list
- Update customer in pool
- Remove customer from pool
- Trigger notification handler

Searches:

- Get pool customers
- Get pool customer by ID
- Get notification handler
- Get all notification handlers in project
- Get notification handler by key

## Dynamic RPCs

- `listProjects`
- `listCustomerPools`
- `listTargetAudienceLists`
- `listNotificationHandlers`
- `listCustomerPoolAttributes`
