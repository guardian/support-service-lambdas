import { toCamelCase } from '../../../../snippets/string';
import type { InsertChunks } from '../../../../types';
import type { GenerationOptions } from '../../../new-api-lambda';

export default ({
	lambdaName,
	includeOpenApiDoc,
}: GenerationOptions): InsertChunks => {
	const camelName = toCamelCase(lambdaName);

	const constDefinition = `const ${camelName}: HandlerDefinition = {
	name: '${lambdaName}',
	dependencies: {
		...dep.zod,
	},
	devDependencies: {
		...devDeps['@types/aws-lambda'],
		${includeOpenApiDoc ? "\t\t...devDeps['@redocly/cli']," : ''}
	},
	${includeOpenApiDoc ? openApiScripts(lambdaName) : ''}
};
`;

	return {
		chunks: [
			{
				marker: '// MARKER new-lambda: buildcheck-const',
				content: constDefinition,
			},
			{
				marker: '// MARKER new-lambda: buildcheck-reference',
				content: `		${camelName},`,
			},
		],
	};
};

function openApiScripts(lambdaName: string) {
	return `extraScripts: {
		...openApiScripts,
		package: \`pnpm type-check && pnpm lint && pnpm openapi:lint && pnpm check-formatting && pnpm test && pnpm build && cd target && zip -qr ${lambdaName}.zip ./*.js.map ./*.js\`,
	},`;
}
