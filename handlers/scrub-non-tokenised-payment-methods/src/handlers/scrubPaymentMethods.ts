import { z } from 'zod';
import { stageFromEnvironment } from '@modules/stage';
import { ZuoraError } from '@modules/zuora/errors';
import {
	getPaymentMethods,
	scrubPaymentMethod,
} from '@modules/zuora/paymentMethod';
import { getSubscriptionsByAccountNumber } from '@modules/zuora/subscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';

/*
 * Deliberately narrow schemas. We only need the subscription status and the
 * card's id and status, so parsing only those keeps the job working on accounts
 * the full schemas would reject: subscriptions in states outside Active and
 * Cancelled, and accounts with no default payment method, which is exactly what
 * an account looks like once we have scrubbed its default.
 */
const subscriptionStatusSchema = z.object({ status: z.string() });

const nonTokenisedCardsSchema = z.object({
	creditcard: z
		.array(z.object({ id: z.string(), status: z.string() }))
		.optional(),
});

export type PaymentMethodToScrub = {
	payment_method_id: string;
	account_id: string;
	account_number: string;
};

export type LambdaEvent = {
	Items: PaymentMethodToScrub[];
};

export type Outcome = 'scrubbed' | 'skipped' | 'wouldScrub';

/**
 * Zuora answers 50000040 when the thing you asked for is not there.
 *
 * That is not a failure for this job, it is the work list having gone stale:
 * the account was removed between the BigQuery snapshot and the run, so the
 * item no longer qualifies and belongs on the skip path. Treating it as a
 * failure would raise an alarm every time. It is also what every item looks
 * like in CODE, where the work list is full of PROD ids the sandbox has never
 * heard of.
 *
 * Narrow on purpose. Any other Zuora error still fails loudly.
 */
const isNotFoundInZuora = (error: unknown): boolean =>
	error instanceof ZuoraError &&
	error.zuoraErrorDetails.some((detail) => detail.code === '50000040');

const undefinedIfNotFound = (error: unknown): undefined => {
	if (isNotFoundInZuora(error)) {
		return undefined;
	}
	throw error;
};

export const handler = async (event: LambdaEvent) => {
	console.log(JSON.stringify(event, null, 2));
	const stage = stageFromEnvironment();
	const dryRun = process.env.DRY_RUN === 'true';
	const zuoraClient = await ZuoraClient.create(stage);

	const failures: string[] = [];
	let scrubbed = 0;
	let wouldScrub = 0;
	let skipped = 0;

	for (const item of event.Items) {
		const { payment_method_id: paymentMethodId } = item;
		try {
			const outcome = await processPaymentMethod({
				zuoraClient,
				item,
				dryRun,
			});
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

	// Surface failures to the distributed map so the state machine can report
	// them. Swallowing them here would leave the result file empty and the SNS
	// alarm would never fire.
	if (failures.length > 0) {
		throw new Error(
			`Failed to scrub ${failures.length} payment method(s): ${failures.join(', ')}`,
		);
	}

	return { scrubbed, wouldScrub, skipped };
};

export const processPaymentMethod = async ({
	zuoraClient,
	item,
	dryRun,
}: {
	zuoraClient: ZuoraClient;
	item: PaymentMethodToScrub;
	dryRun: boolean;
}): Promise<Outcome> => {
	const {
		payment_method_id: paymentMethodId,
		account_id: accountId,
		account_number: accountNumber,
	} = item;

	/*
	 * The work list comes from BigQuery, which lags Zuora by up to a sync
	 * interval. In that window an account can take out a new subscription, or
	 * someone can remove the card by hand. Everything below is re-read from
	 * Zuora before anything is scrubbed.
	 */
	const subscriptions = await getSubscriptionsByAccountNumber(
		zuoraClient,
		accountNumber,
		subscriptionStatusSchema,
	).catch(undefinedIfNotFound);

	if (subscriptions === undefined) {
		console.log(
			`Skipping ${paymentMethodId}: account ${accountNumber} no longer exists in Zuora`,
		);
		return 'skipped';
	}

	if (subscriptions.length === 0) {
		console.log(
			`Skipping ${paymentMethodId}: account ${accountNumber} has no subscriptions`,
		);
		return 'skipped';
	}

	const stillActive = subscriptions.filter((sub) => sub.status !== 'Cancelled');
	if (stillActive.length > 0) {
		console.log(
			`Skipping ${paymentMethodId}: account ${accountNumber} has ${stillActive.length} subscription(s) that are not cancelled`,
		);
		return 'skipped';
	}

	/*
	 * A scrubbed payment method stops being returned by the API altogether, so
	 * this check also makes the job naturally idempotent: anything scrubbed by
	 * an earlier run is simply not found and gets skipped.
	 */
	const paymentMethods = await getPaymentMethods(
		zuoraClient,
		accountId,
		nonTokenisedCardsSchema,
	).catch(undefinedIfNotFound);

	if (paymentMethods === undefined) {
		console.log(
			`Skipping ${paymentMethodId}: account ${accountNumber} has no payment methods in Zuora`,
		);
		return 'skipped';
	}

	const creditCard = paymentMethods.creditcard?.find(
		(card) => card.id === paymentMethodId,
	);

	if (!creditCard) {
		console.log(
			`Skipping ${paymentMethodId}: no longer a non-tokenised card on account ${accountNumber}`,
		);
		return 'skipped';
	}

	if (creditCard.status !== 'Active') {
		console.log(
			`Skipping ${paymentMethodId}: status is ${creditCard.status}, not Active`,
		);
		return 'skipped';
	}

	if (dryRun) {
		console.log(
			`DRY RUN: would scrub ${paymentMethodId} on account ${accountNumber}`,
		);
		return 'wouldScrub';
	}

	/*
	 * No need to detach the payment method from its account first. Scrubbing
	 * works on a default payment method, and on a cancelled account, both of
	 * which reject a delete.
	 *
	 * Nor does anything have to be done about auto pay. Where the scrubbed
	 * method was the account default, Zuora clears the default and switches
	 * auto pay off itself, so the account is never left with auto pay on and
	 * nothing to charge. That covers the ~9k accounts in that state without a
	 * single write from us.
	 */
	await scrubPaymentMethod(zuoraClient, paymentMethodId);
	console.log(`Scrubbed payment method ${paymentMethodId}`);

	return 'scrubbed';
};
