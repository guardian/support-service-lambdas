/**
 * @group unit
 */
import {
	getPaymentMethods,
	scrubPaymentMethod,
} from '@modules/zuora/paymentMethod';
import { getSubscriptionsByAccountNumber } from '@modules/zuora/subscription';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { processPaymentMethod } from '../../src/services';
import {
	activeSubscription,
	cancelledSubscription,
	creditCardFixture,
	paymentMethodToScrubFixture as item,
	paymentMethodsResponseFixture,
	zuoraErrorFixture,
} from '../fixtures';

jest.mock('@modules/zuora/paymentMethod');
jest.mock('@modules/zuora/subscription');

const mockScrubPaymentMethod = jest.mocked(scrubPaymentMethod);
const mockGetPaymentMethods = jest.mocked(getPaymentMethods);
const mockGetSubscriptions = jest.mocked(getSubscriptionsByAccountNumber);

const zuoraClient = {} as ZuoraClient;

beforeEach(() => {
	jest.resetAllMocks();
	mockGetSubscriptions.mockResolvedValue([cancelledSubscription]);
	mockGetPaymentMethods.mockResolvedValue(paymentMethodsResponseFixture());
});

it('scrubs a card on a fully cancelled account', async () => {
	const outcome = await processPaymentMethod({
		zuoraClient,
		item,
		dryRun: false,
	});

	expect(outcome).toBe('scrubbed');
	expect(mockScrubPaymentMethod).toHaveBeenCalledWith(zuoraClient, 'pm-1');
});

it('scrubs the default payment method without detaching it first', async () => {
	// Zuora rejects a delete on a default payment method, but a scrub goes
	// through, so nothing on the account has to be touched.
	mockGetPaymentMethods.mockResolvedValue(
		paymentMethodsResponseFixture({ defaultPaymentMethodId: 'pm-1' }),
	);

	const outcome = await processPaymentMethod({
		zuoraClient,
		item,
		dryRun: false,
	});

	expect(outcome).toBe('scrubbed');
	expect(mockScrubPaymentMethod).toHaveBeenCalledWith(zuoraClient, 'pm-1');
});

it('skips when the account has taken out a new subscription since the query ran', async () => {
	mockGetSubscriptions.mockResolvedValue([
		cancelledSubscription,
		activeSubscription,
	]);

	const outcome = await processPaymentMethod({
		zuoraClient,
		item,
		dryRun: false,
	});

	expect(outcome).toBe('skipped');
	expect(mockScrubPaymentMethod).not.toHaveBeenCalled();
});

it('skips an account with no subscriptions at all', async () => {
	mockGetSubscriptions.mockResolvedValue([]);

	const outcome = await processPaymentMethod({
		zuoraClient,
		item,
		dryRun: false,
	});

	expect(outcome).toBe('skipped');
	expect(mockScrubPaymentMethod).not.toHaveBeenCalled();
});

it('skips a card already scrubbed by an earlier run', async () => {
	// A scrubbed payment method stops being returned by Zuora at all, which is
	// what makes the job idempotent.
	mockGetPaymentMethods.mockResolvedValue(
		paymentMethodsResponseFixture({ creditcard: [] }),
	);

	const outcome = await processPaymentMethod({
		zuoraClient,
		item,
		dryRun: false,
	});

	expect(outcome).toBe('skipped');
	expect(mockScrubPaymentMethod).not.toHaveBeenCalled();
});

it('skips, rather than fails, when Zuora no longer has the account', async () => {
	// 50000040 means the work list has gone stale, not that something broke.
	// Failing here would alarm on every run.
	mockGetSubscriptions.mockRejectedValue(
		zuoraErrorFixture('50000040', "Cannot find entity by key: 'acc-id-1'."),
	);

	const outcome = await processPaymentMethod({
		zuoraClient,
		item,
		dryRun: false,
	});

	expect(outcome).toBe('skipped');
	expect(mockScrubPaymentMethod).not.toHaveBeenCalled();
});

it('still fails loudly on any other Zuora error', async () => {
	mockGetSubscriptions.mockRejectedValue(
		zuoraErrorFixture('99999999', 'Something else went wrong'),
	);

	await expect(
		processPaymentMethod({ zuoraClient, item, dryRun: false }),
	).rejects.toThrow('Something else went wrong');
});

it('skips a card that is no longer Active', async () => {
	mockGetPaymentMethods.mockResolvedValue(
		paymentMethodsResponseFixture({
			creditcard: [creditCardFixture({ status: 'Closed' })],
		}),
	);

	const outcome = await processPaymentMethod({
		zuoraClient,
		item,
		dryRun: false,
	});

	expect(outcome).toBe('skipped');
	expect(mockScrubPaymentMethod).not.toHaveBeenCalled();
});

it('touches nothing in Zuora on a dry run, and says so', async () => {
	const outcome = await processPaymentMethod({
		zuoraClient,
		item,
		dryRun: true,
	});

	expect(outcome).toBe('wouldScrub');
	expect(mockScrubPaymentMethod).not.toHaveBeenCalled();
});
