import { stageFromEnvironment } from '@modules/stage';
import { scrubBatch } from '../services';
import type { BatchResult, LambdaEvent } from '../types';

export const handler = async (event: LambdaEvent): Promise<BatchResult> => {
	console.log(JSON.stringify(event, null, 2));

	return await scrubBatch({
		stage: stageFromEnvironment(),
		items: event.Items,
		dryRun: process.env.DRY_RUN === 'true',
	});
};
