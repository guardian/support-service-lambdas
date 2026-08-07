import { uploadFileToS3 } from '@modules/aws/s3';
import { stageFromEnvironment } from '@modules/stage';
import { bucketName, DAILY_SCRUB_LIMIT } from '../constants';
import { findPaymentMethodsToScrub } from '../services';

/**
 * First state of the scrub-non-tokenised-payment-methods state machine.
 *
 * Invoked by the state machine, which an EventBridge rule starts at 6am daily.
 * That rule is only enabled in PROD, so in CODE this runs when someone starts
 * an execution by hand.
 *
 * Builds the work list for the run: non-tokenised cards on accounts where every
 * subscription is cancelled. Writes it to S3 rather than returning it, because
 * the distributed map reads its items from a file and a list this size will not
 * fit in the payload passed between states.
 */
export const handler = async ({ filePath }: { filePath: string }) => {
	const stage = stageFromEnvironment();
	const paymentMethods = await findPaymentMethodsToScrub(stage);

	// Hitting the cap means there is still a backlog to get through. Once runs
	// stop reaching it, we are down to the ongoing trickle.
	console.log(
		`Found ${paymentMethods.length} payment methods to scrub, out of a maximum of ${DAILY_SCRUB_LIMIT}`,
	);

	await uploadFileToS3({
		bucketName: bucketName(stage),
		filePath,
		content: JSON.stringify(paymentMethods),
	});
};
