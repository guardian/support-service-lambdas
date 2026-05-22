import type { InsertChunks } from '../../../../../types';
import type { GenerationOptions } from '../../../index';

export default ({ lambdaName }: GenerationOptions): InsertChunks => ({
	chunks: [
		{
			marker: '# MARKER new-lambda: github-action',
			content: `          - ${lambdaName}`,
		},
	],
});
