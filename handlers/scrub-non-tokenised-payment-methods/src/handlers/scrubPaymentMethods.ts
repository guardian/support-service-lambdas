import { stageFromEnvironment } from '@modules/stage';
import { scrubBatch } from '../services';
import type { BatchResult, LambdaEvent } from '../types';

/**
 * Second state of the scrub-non-tokenised-payment-methods state machine.
 *
 * Invoked by the distributed map, once per batch, over the work list the first
 * lambda wrote to S3. Batches are one item and run one at a time, to stay well
 * inside Zuora's rate limit.
 *
 * Strips the card data from each payment method, after re-reading it from Zuora
 * to confirm it still qualifies. Throws if any item failed, so the map records
 * it and the state machine can raise the alarm.
 *
 * DRY_RUN is on by default: every check runs and the intended action is logged,
 * but nothing is written to Zuora.
 */
export const handler = async (event: LambdaEvent): Promise<BatchResult> => {
	console.log(JSON.stringify(event, null, 2));

	return await scrubBatch({
		stage: stageFromEnvironment(),
		items: event.Items,
		dryRun: process.env.DRY_RUN === 'true',
	});
};
