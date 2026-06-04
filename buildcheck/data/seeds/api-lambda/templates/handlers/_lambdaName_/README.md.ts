import type { MaybeTemplateContent } from '@buildcheck/types';
import type { TemplateParams } from '../../../index';

export default ({
	lambdaName,
	includeOpenApiDoc,
}: TemplateParams): MaybeTemplateContent =>
	`# ${lambdaName} API

## URLs

#### CODE - https://${lambdaName}-code.support.guardianapis.com/

#### PROD - https://${lambdaName}.support.guardianapis.com/
${
	includeOpenApiDoc
		? `
## OpenAPI

The OpenAPI description for this handler is in \`openapi.yaml\`. The spec is linted automatically as part of \`pnpm package\`.

### Validate and preview locally

\`\`\`bash
# Lint the OpenAPI spec
pnpm --filter ${lambdaName} openapi:lint

# Open an interactive preview in the browser
pnpm --filter ${lambdaName} openapi:preview
\`\`\`

### External documentation

- OpenAPI specification: https://spec.openapis.org/oas/latest.html
- Redocly CLI: https://redocly.com/docs/cli/
`
		: '\n'
}`;
