import { toPascalCase } from '../../../../snippets/string';
import type { InsertChunks } from '../../../../types';
import type { GenerationOptions } from '../../../new-api-lambda';

export default ({ lambdaName }: GenerationOptions): InsertChunks => {
	const className = toPascalCase(lambdaName);
	return {
		chunks: [
			{
				marker: 'import type { SrStageNames }',
				content: `import { ${className} } from '../lib/${lambdaName}';`,
			},
			{
				marker: '// MARKER new-lambda: cdk-bin',
				content: `\t${className},`,
			},
		],
	};
};
