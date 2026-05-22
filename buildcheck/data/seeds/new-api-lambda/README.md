# new-api-lambda seed reference

Creates the standard boilerplate for a new API Gateway lambda in this repository.

If you want to create a new lambda, follow the instructions here - [handlers/HOWTO-create-lambda.md](../handlers/HOWTO-create-lambda.md)

To learn how seeds work and how to edit or add templates see [README-seeds.md](../../../README-seeds.md)

## Usage

```bash
cd buildcheck
pnpm seed new-api-lambda --lambdaName=<name> --includeApiKey=<Y|N> --includeOpenApiDoc=<Y|N>
```

## Flags

| Flag | Accepted values | Description |
|---|---|---|
| `--lambdaName` | kebab-case string, e.g. `my-new-lambda` | The name of the lambda. Used as the handler directory name, CDK class name, and URL subdomain. |
| `--includeApiKey` | `Y` / `N` | Whether to require an API key for requests. If `N`, the lambda is made public. |
| `--includeOpenApiDoc` | `Y` / `N` | Whether to generate an OpenAPI spec (`openapi.yaml`) and Redocly config. Adds lint and preview scripts to `package.json`. |

## What it generates

The seed writes the handler source files, CDK stack definition and test, and wires the lambda into the existing shared config files:

- **Handler source** — `handlers/<lambdaName>/src/index.ts`, `helloEndpoint.ts`, and tests under `handlers/<lambdaName>/test/`
- **OpenAPI** — `handlers/<lambdaName>/openapi.yaml` and `redocly.yaml` (only if `--includeOpenApiDoc=Y`)
- **CDK** — `cdk/lib/<lambdaName>.ts` and [`cdk/lib/<lambdaName>.test.ts`](../../../cdk/lib/)
- **Wired into existing files** — adds the lambda to [`.github/workflows/ci-typescript.yml`](../../../../.github/workflows/ci-typescript.yml), [`buildcheck/data/build.ts`](../../build.ts), and [`cdk/bin/cdk.ts`](../../../../cdk/bin/cdk.ts)

After writing files, the seed automatically runs `pnpm snapshot:update`, `pnpm install`, CDK lint, formatting, and `pnpm --filter cdk test-update` to generate the initial CDK snapshot.
