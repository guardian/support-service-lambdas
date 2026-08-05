/**
 * Runs the handler against real Zuora in CODE.
 *
 * The BigQuery half of the job cannot be exercised here: the zuora dataset
 * mirrors PROD, so the work list it produces is full of ids the sandbox has
 * never seen. This test builds the same work list straight from the sandbox
 * instead, and then runs the part that actually writes.
 *
 * It finds its own target rather than hardcoding one, because scrubbing is one
 * way: a fixed account would be spent after the first run and the test would
 * never pass again.
 *
 * @group integration
 */
import { z } from 'zod';
import type { Stage } from '@modules/stage';
import { getPaymentMethods } from '@modules/zuora/paymentMethod';
import { doQuery } from '@modules/zuora/query';
import { getSubscriptionsByAccountNumber } from '@modules/zuora/subscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { PaymentMethodToScrub } from '../src/handlers/scrubPaymentMethods';
import { processPaymentMethod } from '../src/handlers/scrubPaymentMethods';

const stage: Stage = 'CODE';

/**
 * AccountId is optional because Zuora allows orphan payment methods, created
 * without an account and given ten days to be attached to one. They are not
 * targets, so they get filtered out below.
 */
const cardQuerySchema = z.object({
	records: z
		.array(z.object({ Id: z.string(), AccountId: z.string().optional() }))
		.optional(),
});

const accountQuerySchema = z.object({
	records: z
		.array(z.object({ Id: z.string(), AccountNumber: z.string() }))
		.optional(),
});

/**
 * A target is a non-tokenised card, still Active, on an account whose every
 * subscription is cancelled. Same definition the BigQuery query uses.
 */
const findATarget = async (
	zuoraClient: ZuoraClient,
): Promise<PaymentMethodToScrub | undefined> => {
	const cards = await doQuery(
		zuoraClient,
		"select Id, AccountId from PaymentMethod where Type = 'CreditCard' and PaymentMethodStatus = 'Active'",
		cardQuerySchema,
	);

	const attachedCards = (cards.records ?? []).filter(
		(card): card is { Id: string; AccountId: string } =>
			card.AccountId !== undefined,
	);

	for (const card of attachedCards.slice(0, 60)) {
		const accounts = await doQuery(
			zuoraClient,
			`select Id, AccountNumber from Account where Id = '${card.AccountId}'`,
			accountQuerySchema,
		);
		const accountNumber = accounts.records?.[0]?.AccountNumber;
		if (!accountNumber) {
			continue;
		}

		const subscriptions = await getSubscriptionsByAccountNumber(
			zuoraClient,
			accountNumber,
			z.object({ status: z.string() }),
		).catch(() => []);

		const qualifies =
			subscriptions.length > 0 &&
			subscriptions.every((sub) => sub.status === 'Cancelled');

		if (qualifies) {
			return {
				payment_method_id: card.Id,
				account_id: card.AccountId,
				account_number: accountNumber,
			};
		}
	}
	return undefined;
};

const cardIsStillThere = async (
	zuoraClient: ZuoraClient,
	item: PaymentMethodToScrub,
): Promise<boolean> => {
	const paymentMethods = await getPaymentMethods(
		zuoraClient,
		item.account_id,
		z.object({
			creditcard: z.array(z.object({ id: z.string() })).optional(),
		}),
	);
	return (paymentMethods.creditcard ?? []).some(
		(card) => card.id === item.payment_method_id,
	);
};

test('scrubs a real card in CODE, and skips it on a second run', async () => {
	const zuoraClient = await ZuoraClient.create(stage);

	const item = await findATarget(zuoraClient);
	if (!item) {
		throw new Error(
			'No non-tokenised card on a fully cancelled account left in CODE. Earlier runs will have scrubbed them; create a subscription, cancel it, and try again.',
		);
	}
	console.log('Target:', JSON.stringify(item));

	expect(await cardIsStillThere(zuoraClient, item)).toBe(true);

	// A dry run says what it would do and leaves Zuora alone.
	expect(await processPaymentMethod({ zuoraClient, item, dryRun: true })).toBe(
		'wouldScrub',
	);
	expect(await cardIsStillThere(zuoraClient, item)).toBe(true);

	// For real this time.
	expect(await processPaymentMethod({ zuoraClient, item, dryRun: false })).toBe(
		'scrubbed',
	);
	expect(await cardIsStillThere(zuoraClient, item)).toBe(false);

	// Scrubbing is one way, and a scrubbed card stops being returned at all, so
	// a second pass over the same work list finds nothing and skips. This is
	// what makes the daily job safe to re-run.
	expect(await processPaymentMethod({ zuoraClient, item, dryRun: false })).toBe(
		'skipped',
	);
}, 120000);
