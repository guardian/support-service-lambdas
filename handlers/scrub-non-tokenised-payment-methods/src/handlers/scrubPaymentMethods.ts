import { stageFromEnvironment } from '@modules/stage';
import {
	getPaymentMethods,
	scrubPaymentMethod,
} from '@modules/zuora/paymentMethod';
import { getSubscriptionsByAccountNumber } from '@modules/zuora/subscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';

export type PaymentMethodToScrub = {
	payment_method_id: string;
	account_id: string;
	account_number: string;
};

export type LambdaEvent = {
	Items: PaymentMethodToScrub[];
};

export type Outcome = 'scrubbed' | 'skipped';

export const handler = async (event: LambdaEvent) => {
	console.log(JSON.stringify(event, null, 2));
	const stage = stageFromEnvironment();
	const dryRun = process.env.DRY_RUN === 'true';
	const zuoraClient = await ZuoraClient.create(stage);

	const failures: string[] = [];
	let scrubbed = 0;
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
		`Batch finished: ${scrubbed} scrubbed, ${skipped} skipped, ${failures.length} failed`,
	);

	// Surface failures to the distributed map so the state machine can report
	// them. Swallowing them here would leave the result file empty and the SNS
	// alarm would never fire.
	if (failures.length > 0) {
		throw new Error(
			`Failed to scrub ${failures.length} payment method(s): ${failures.join(', ')}`,
		);
	}

	return { scrubbed, skipped };
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
	);

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
	const paymentMethods = await getPaymentMethods(zuoraClient, accountId);
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
		return 'scrubbed';
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
