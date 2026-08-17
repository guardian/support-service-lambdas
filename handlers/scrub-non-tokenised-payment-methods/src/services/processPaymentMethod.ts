import {
	getPaymentMethods,
	scrubPaymentMethod,
} from '@modules/zuora/paymentMethod';
import { getSubscriptionsByAccountNumber } from '@modules/zuora/subscription';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { ACTIVE_PAYMENT_METHOD_STATUS } from '../constants';
import { undefinedIfNotFound } from '../helpers';
import { nonTokenisedCardsSchema, subscriptionStatusSchema } from '../schemas';
import type { Outcome, PaymentMethodToScrub } from '../types';
import { stillBillingReason } from './stillBillingReason';

/**
 * Decides what to do with one payment method, and does it.
 *
 * The work list comes from BigQuery, which lags Zuora by up to a sync interval.
 * In that window an account can take out a new subscription, or someone can
 * remove the card by hand. Everything below is re-read from Zuora before
 * anything is scrubbed.
 */
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

	const stillBilling = stillBillingReason(subscriptions);
	if (stillBilling !== undefined) {
		console.log(
			`Skipping ${paymentMethodId}: account ${accountNumber} has ${stillBilling}`,
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

	if (creditCard.status !== ACTIVE_PAYMENT_METHOD_STATUS) {
		console.log(
			`Skipping ${paymentMethodId}: status is ${creditCard.status}, not ${ACTIVE_PAYMENT_METHOD_STATUS}`,
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
	 * method was the account default, Zuora clears the default and switches auto
	 * pay off itself, so the account is never left with auto pay on and nothing
	 * to charge. That covers the ~9k accounts in that state without a single
	 * write from us.
	 */
	await scrubPaymentMethod(zuoraClient, paymentMethodId);
	console.log(`Scrubbed payment method ${paymentMethodId}`);

	return 'scrubbed';
};
