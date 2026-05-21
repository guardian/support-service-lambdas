import type { InsertChunks } from '../../../../types';
import type { GenerationOptions } from '../../../new-api-lambda';

function toCamelCase(name: string): string {
	const parts = name.split('-');
	return (
		parts[0] +
		parts
			.slice(1)
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join('')
	);
}

function asDevDependenciesStr(devDependencies: string[]) {
	return Object.keys(devDependencies).length > 0
		? [
				`\tdevDependencies: {\n${devDependencies
					.map((name) => `\t\t...devDeps['${name}'],`)
					.join('\n')}\n\t}`,
			]
		: [];
}

function asExtraScriptsStr(extraScripts: Record<string, string>) {
	return Object.keys(extraScripts).length > 0
		? [
				`\textraScripts: {\n${Object.entries(extraScripts)
					.map(([k, v]) => `\t\t'${k}': '${v}',`)
					.join('\n')}\n\t}`,
			]
		: [];
}

export default ({
	lambdaName,
	includeOpenApiDoc,
}: GenerationOptions): InsertChunks => {
	const camelName = toCamelCase(lambdaName);

	const extraScripts: Record<string, string> = includeOpenApiDoc
		? {
				'openapi:lint': 'redocly lint openapi.yaml',
				'openapi:preview':
					'redocly build-docs openapi.yaml --output target/docs/index.html && open target/docs/index.html',
				package: `pnpm type-check && pnpm lint && pnpm openapi:lint && pnpm check-formatting && pnpm test && pnpm build && cd target && zip -qr ${lambdaName}.zip ./*.js.map ./*.js`,
			}
		: {};

	const devDependencies = [
		'@types/aws-lambda',
		...(includeOpenApiDoc ? ['@redocly/cli'] : []),
	];

	const constDefinition = `const ${camelName}: HandlerDefinition = {
	name: '${lambdaName}',
	dependencies: {
		...dep.zod,
	},
${[...asDevDependenciesStr(devDependencies), ...asExtraScriptsStr(extraScripts)].join(',\n')},
};
`;

	return {
		chunks: [
			{
				marker: '// MARKER new-lambda: buildcheck-const',
				content: constDefinition,
				position: 'before',
			},
			{
				marker: '// MARKER new-lambda: buildcheck-reference',
				content: `		${camelName},`,
				position: 'before',
			},
		],
	};
};
