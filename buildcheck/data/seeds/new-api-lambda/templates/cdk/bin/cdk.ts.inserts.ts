import { toPascalCase } from '../../../../../snippets/string';
import type { InsertChunks } from '../../../../../types';
import type { GenerationOptions } from '../../../index';

export default ({ lambdaName }: GenerationOptions): InsertChunks => [
	{
		marker: 'import type { SrStageNames }',
		content: `import { ${toPascalCase(lambdaName)} } from '../lib/${lambdaName}';`,
	},
	{
		marker: '// MARKER new-lambda: cdk-bin',
		content: `\t${toPascalCase(lambdaName)},`,
	},
];
