import type { Stage } from '@modules/stage';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { BatchResult, PaymentMethodToScrub } from '../types';
import { processPaymentMethod } from './processPaymentMethod';

/**
 * Runs one batch of the work list and reports the tally.
 *
 * Throws if any item failed, so the distributed map records it. Swallowing
 * failures here would leave the map's result file empty, so the state machine's
 * failure branch would never fire and neither would the alarm.
 */
export const scrubBatch = async ({
	stage,
	items,
	dryRun,
}: {
	stage: Stage;
	items: PaymentMethodToScrub[];
	dryRun: boolean;
}): Promise<BatchResult> => {
	const zuoraClient = await ZuoraClient.create(stage);

	const failures: string[] = [];
	let scrubbed = 0;
	let wouldScrub = 0;
	let skipped = 0;

	for (const item of items) {
		const { payment_method_id: paymentMethodId } = item;
		try {
			const outcome = await processPaymentMethod({ zuoraClient, item, dryRun });
			if (outcome === 'scrubbed') {
				scrubbed++;
			} else if (outcome === 'wouldScrub') {
				wouldScrub++;
			} else {
				skipped++;
			}
		} catch (error) {
			failures.push(paymentMethodId);
			console.error(
				`Failed to scrub payment method ${paymentMethodId}:`,
				error,
			);
		}
	}

	console.log(
		`Batch finished: ${scrubbed} scrubbed, ${wouldScrub} would have been scrubbed, ${skipped} skipped, ${failures.length} failed`,
	);

	if (failures.length > 0) {
		throw new Error(
			`Failed to scrub ${failures.length} payment method(s): ${failures.join(', ')}`,
		);
	}

	return { scrubbed, wouldScrub, skipped };
};
