import { toPascalCase } from '../../../../../snippets/string';
import type { InsertChunks } from '../../../../../types';
import type { GenerationOptions } from '../../../index';

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
