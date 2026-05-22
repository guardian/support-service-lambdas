import type { InsertChunks } from '../../../../../types';
import type { GenerationOptions } from '../../../index';

export default ({ lambdaName }: GenerationOptions): InsertChunks => [
	{
		marker: '# MARKER new-lambda: github-action',
		content: `          - ${lambdaName}`,
	},
];
