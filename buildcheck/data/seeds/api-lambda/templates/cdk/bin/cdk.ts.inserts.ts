import type { TemplateParams } from '@buildcheck/seeds/api-lambda/index';
import { toPascalCase } from '@buildcheck/snippets/string';
import type { InsertChunks } from '@buildcheck/types';

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
