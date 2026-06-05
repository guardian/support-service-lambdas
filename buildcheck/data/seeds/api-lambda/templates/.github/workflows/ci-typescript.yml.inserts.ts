import type { InsertChunks } from '@buildcheck/types';
import type { TemplateParams } from '../../../index';

export default ({ lambdaName }: TemplateParams): InsertChunks => [
	{
		marker: '# MARKER new-lambda: github-action',
		content: `          - ${lambdaName}`,
	},
];
