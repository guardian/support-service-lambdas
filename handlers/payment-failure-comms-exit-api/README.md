# payment-failure-comms-exit-api

Synchronous CSR endpoint that stops a customer’s payment-failure communications journey in Braze.

`POST /exit` accepts a Guardian Identity ID, gets the associated `brazeUuid` from IDAPI, and sends Braze one `pf_csr_exit` custom event. The event uses `_update_existing_only`, so it cannot create a Braze profile. A `200` response means Braze accepted the event; a `404` means the Identity ID was not found.

## URLs

#### CODE - https://payment-failure-comms-exit-api-code.support.guardianapis.com/exit

#### PROD - https://payment-failure-comms-exit-api.support.guardianapis.com/exit

Both environments require the API key in the `x-api-key` header. In the AWS console, find it under **API Gateway** → **API keys** as `payment-failure-comms-exit-api-key-{stage}`.

## Configuration

The Lambda reads its application configuration from its standard SSM path:

| Key | Description |
| --- | --- |
| `braze.apiUrl` | Braze REST API base URL |
| `braze.apiKey` | Braze REST API key |
| `braze.appId` | Braze app ID used by the payment-failure canvas |
| `identity.accessToken` | Identity client access token used for the IDAPI lookup |

These parameters must be configured in CODE before the first functional test, and in PROD before deployment. They are intentionally not committed here.

## OpenAPI

The OpenAPI description for this handler is in `openapi.yaml`. The spec is linted automatically as part of `pnpm package`.

### Validate and preview locally

```bash
# Lint the OpenAPI spec
pnpm --filter payment-failure-comms-exit-api openapi:lint

# Open an interactive preview in the browser
pnpm --filter payment-failure-comms-exit-api openapi:preview
```

### External documentation

- OpenAPI specification: https://spec.openapis.org/oas/latest.html
- Redocly CLI: https://redocly.com/docs/cli/
