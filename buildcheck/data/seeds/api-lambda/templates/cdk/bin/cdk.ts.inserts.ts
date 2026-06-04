import type { InsertChunks } from '@buildcheck/types';
import { toPascalCase } from '../../../../../snippets/string';
import type { TemplateParams } from '../../../index';

export default ({ lambdaName }: TemplateParams): InsertChunks => [
	{
		marker: 'import type { SrStageNames }',
		content: `import { ${toPascalCase(lambdaName)} } from '../lib/${lambdaName}';`,
	},
	{
		marker: '// MARKER new-lambda: cdk-bin',
		content: `\t${toPascalCase(lambdaName)},`,
	},
];
