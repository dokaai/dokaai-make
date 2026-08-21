# Contributing

## Local Setup

```bash
npm install
npm run check
```

## Adding A DokaAI Operation

1. Update `src/api/index.json`.
2. Add the OpenAPI `operationId` to `src/make-operation-ids.ts`.
3. Run `npm run check`.
4. Review the generated section in `generated/modules/`.

Prefer generic OpenAPI inference over custom module code. Add reusable adapters
only when Make needs a platform-specific UX behavior such as an RPC-backed
dropdown or dynamic interface.
