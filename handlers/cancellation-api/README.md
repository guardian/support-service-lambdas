# Cancellation API

## Overview

Subscription cancellation preview and execute API with generated OpenAPI and
interactive documentation.

**WIP:** routing, request validation, documentation and local serving are
implemented. Both POST endpoints currently return the fixed
`{ "type": "hard", "willRefund": false }` example. Zuora/ownership checks,
cancellation, emails and events are not implemented; do not connect real
customer journeys yet.

| Operation | Path |
| --- | --- |
| Preview | `/subscriptions/{subscriptionNumber}/preview-cancellation` |
| Execute | `/subscriptions/{subscriptionNumber}/cancel` |
| Generated OpenAPI | `/openapi.json` |
| Scalar interactive docs | `/docs` |

The docs are public. API Gateway validates API keys for operations; the app
validates the identity header and request shape.
Local operation requests need `x-identity-id` but no API Gateway key.

## Local development and testing

```sh
pnpm --filter cancellation-api local
# Open http://localhost:8787/docs

curl -X POST http://localhost:8787/subscriptions/A-S12345678/preview-cancellation \
  -H 'Content-Type: application/json' -H 'x-identity-id: 123456789' -d '{}'

pnpm --filter cancellation-api test
pnpm --filter cancellation-api type-check
pnpm --filter cancellation-api build
pnpm --filter cancellation-api fix-formatting
pnpm --filter cancellation-api lint --fix
pnpm --filter cancellation-api cdk:test
```

The local server binds to loopback only. Scalar loads its pinned browser bundle
from jsDelivr; API requests go directly to this server, not a Scalar proxy.
Authentication persistence is disabled. Enter any deployed CODE API key only in
the interactive client's authentication control; no credentials are embedded.
No AWS credentials are currently needed to run locally.

When deployed, base URLs are
https://cancellation-api-code.support.guardianapis.com and
https://cancellation-api.support.guardianapis.com. Documentation and API calls
use the same origin, including when accessed through an API Gateway stage URL.

OpenAPI is generated from the Zod route schemas; there is no separate YAML
contract to maintain. Hono's OpenAPI validators handle JSON content types and
body validation (`415` for an unsupported media type, `400` for invalid input).
Dependency/script changes are defined in buildcheck.

`src/index.ts` creates the app, registers endpoints and exports the Lambda
handler. Each file in `src/endpoints/` keeps a route's definition, request schema
and typed implementation together; `cancellationContract.ts` contains the
endpoint-only shared request/response contract.
`modules/routing/src/srApi.ts` provides shared request logging, error handling,
API-key documentation and public OpenAPI/Scalar routes. Route handlers access
plain, schema-inferred `{ params, headers, body }` objects. Undeclared request
parts are `undefined`; when declaring a JSON body, make it required.
`createSrApi(info, routes)` accepts an array of endpoints. Each endpoint uses
`defineSrRoute` to select its own logger context from those
validated values, for example
`logContext: ({ params }) => params.subscriptionNumber`. The extractor runs
after validation and before the handler; request middleware clears context
afterwards. `logContext` is required; set it to `undefined` when no useful
correlation value exists. ESLint directs route definitions to this wrapper
rather than importing `defineOpenAPIRoute` directly.

Handlers return plain objects (or promises), not Hono responses. Every SR route
must declare a Zod schema at `responses[200].content['application/json'].schema`;
it defines the handler's return type and parses the result before serialising
HTTP 200. Invalid output is logged and becomes HTTP 500. Response-schema
defaults/transforms are applied by the wrapper. Native Hono routes remain
available for docs, redirects and other non-JSON responses.

## References

- [Hono Zod OpenAPI](https://hono.dev/examples/zod-openapi)
- [Hono AWS Lambda adapter (`@hono/aws-lambda`)](https://hono.dev/docs/getting-started/aws-lambda)
- [Scalar HTML integration](https://scalar.com/products/api-references/getting-started)
- [Proof of concept #3610](https://github.com/guardian/support-service-lambdas/pull/3610)

