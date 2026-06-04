import type { InsertChunks } from '@buildcheck/types';
import { toCamelCase } from '../../../../../snippets/string';
import type { TemplateParams } from '../../../index';

export default ({
	lambdaName,
	includeOpenApiDoc,
}: TemplateParams): InsertChunks => [
	{
		marker: '// MARKER new-lambda: buildcheck-const',
		content: buildHandlerConstDefinition(lambdaName, includeOpenApiDoc),
	},
	{
		marker: '// MARKER new-lambda: buildcheck-reference',
		content: `		${toCamelCase(lambdaName)},`,
	},
];

function buildHandlerConstDefinition(
	lambdaName: string,
	includeOpenApiDoc: boolean,
) {
	const camelName = toCamelCase(lambdaName);

	return `const ${camelName}: HandlerDefinition = {
	name: '${lambdaName}',
	dependencies: {
		...dep.zod,
	},
	devDependencies: {
		...devDeps['@types/aws-lambda'],
		${includeOpenApiDoc ? "\t\t...devDeps['@redocly/cli']," : ''}
	},
	moduleDependencies: [moduleLogger],
	${includeOpenApiDoc ? openApiScripts(lambdaName) : ''}
};
`;
}

function openApiScripts(lambdaName: string) {
	return `extraScripts: {
		...openApiScripts,
		package: \`pnpm type-check && pnpm lint && pnpm openapi:lint && pnpm check-formatting && pnpm test && pnpm build && cd target && zip -qr ${lambdaName}.zip ./*.js.map ./*.js\`,
	},`;
}
