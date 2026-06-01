# user-subscriptions-api API

## URLs

#### CODE - https://user-subscriptions-api-code.support.guardianapis.com/

#### PROD - https://user-subscriptions-api.support.guardianapis.com/

## Overview

This api provides a way to fetch subscription information to display in manage my account.

The initial call returns a list of subscriptions based on a single call to Zuora, allowing a fast initial
paint of the page.  Other information can be fetched in the background to fill out the remaining parts of
the page.

## OpenAPI

The OpenAPI description for this handler is in `openapi.yaml`. The spec is linted automatically as part of `pnpm package`.

### Validate and preview locally

```bash
# Lint the OpenAPI spec
pnpm --filter user-subscriptions-api openapi:lint

# Open an interactive preview in the browser
pnpm --filter user-subscriptions-api openapi:preview
```

### External documentation

- OpenAPI specification: https://spec.openapis.org/oas/latest.html
- Redocly CLI: https://redocly.com/docs/cli/



