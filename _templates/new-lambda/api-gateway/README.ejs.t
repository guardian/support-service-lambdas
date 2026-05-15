---
# This template creates a README file for the new lambda

to: handlers/<%=lambdaName%>/README.md
sh: git add handlers/<%=lambdaName%>/README.md
---
# <%=lambdaName%> API

## URLs

#### CODE - https://<%=lambdaName%>-code.support.guardianapis.com/

#### PROD - https://<%=lambdaName%>.support.guardianapis.com/

## OpenAPI

The OpenAPI description for this handler is in `openapi.yaml`. The spec is linted automatically as part of `pnpm package`.

### Validate and preview locally

```bash
# Lint the OpenAPI spec
pnpm --filter <%=lambdaName%> openapi:lint

# Open an interactive preview in the browser
pnpm --filter <%=lambdaName%> openapi:preview
```

### External documentation

- OpenAPI specification: https://spec.openapis.org/oas/latest.html
- Redocly CLI: https://redocly.com/docs/cli/


