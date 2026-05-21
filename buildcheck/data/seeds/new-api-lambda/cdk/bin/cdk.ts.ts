import type { InsertChunks } from '../../../../types';
import type { GenerationOptions } from '../../../new-api-lambda';

function toPascalCase(name: string): string {
	return name
		.split('-')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join('');
}

export default ({ lambdaName }: GenerationOptions): InsertChunks => {
	const className = toPascalCase(lambdaName);
	return {
		chunks: [
			{
				marker: 'import type { SrStageNames }',
				content: `import { ${className} } from '../lib/${lambdaName}';`,
				position: 'before',
			},
			{
				marker: '// MARKER new-lambda: cdk-bin',
				content: `\t${className},`,
				position: 'before',
			},
		],
	};
};
