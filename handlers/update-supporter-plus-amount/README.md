# update-supporter-plus-amount

## Overview

This lambda now uses Hono for path routing while retaining the existing entrypoint in `src/index.ts`.

It exposes:

- `POST /update-supporter-plus-amount/{subscriptionNumber}` to update the supporter plus amount
- `GET /openapi.json` to generate and serve OpenAPI JSON at request time from registered Hono route definitions and zod schemas
- `GET /docs` to serve a Scalar "try it yourself" UI backed by `/openapi.json`

The core business logic remains in existing files such as `src/updateSupporterPlusAmount.ts` and `src/zuoraApi.ts`.

## How to test

```bash
pnpm type-check
pnpm test
```

Integration tests can still be run separately:

```bash
pnpm it-test
```

To run locally on loopback and automatically open the docs UI:

```bash
pnpm local
```

## References

- Hono AWS Lambda adapter: https://hono.dev/docs/getting-started/aws-lambda
- OpenAPI Specification: https://spec.openapis.org/oas/latest.html
- Scalar API Reference: https://github.com/scalar/scalar


