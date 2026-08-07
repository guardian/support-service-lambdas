import { uploadFileToS3 } from '@modules/aws/s3';
import { stageFromEnvironment } from '@modules/stage';
import { bucketName, DAILY_SCRUB_LIMIT } from '../constants';
import { isSameWorkList } from '../helpers';
import {
	findPaymentMethodsToScrub,
	readPreviousWorkList,
	savePreviousWorkList,
} from '../services';

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
	const dryRun = process.env.DRY_RUN === 'true';
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

	/*
	 * Nothing here proves a run achieved anything. A scrubbed payment method
	 * stops being returned by Zuora, so it is skipped on the next run, and every
	 * item skipping looks exactly like a healthy run: the map succeeds, no item
	 * fails, no alarm fires. If those rows also never leave the BigQuery mirror,
	 * the same work list comes back day after day and the backlog never moves,
	 * silently.
	 *
	 * So compare with the list the last real run was given. Identical means that
	 * run changed nothing, which is worth failing over: a run that alarms is
	 * better than a job that quietly does nothing for weeks.
	 *
	 * Skipped in dry run, where by definition nothing is scrubbed and the list is
	 * expected to repeat.
	 */
	if (!dryRun) {
		const previous = await readPreviousWorkList(stage);

		if (
			previous !== undefined &&
			paymentMethods.length > 0 &&
			isSameWorkList(previous, paymentMethods)
		) {
			throw new Error(
				`The work list is identical to the last run's ${paymentMethods.length} payment methods, so that run changed nothing. Check whether scrubbed methods are leaving the BigQuery mirror.`,
			);
		}

		await savePreviousWorkList(stage, paymentMethods);
	}
};
