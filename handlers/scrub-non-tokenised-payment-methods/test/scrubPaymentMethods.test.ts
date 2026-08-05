/**
 * @group unit
 */
import {
	getPaymentMethods,
	scrubPaymentMethod,
} from '@modules/zuora/paymentMethod';
import { getSubscriptionsByAccountNumber } from '@modules/zuora/subscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { PaymentMethodToScrub } from '../src/handlers/scrubPaymentMethods';
import {
	handler,
	processPaymentMethod,
} from '../src/handlers/scrubPaymentMethods';

jest.mock('@modules/zuora/paymentMethod');
jest.mock('@modules/zuora/subscription');
jest.mock('@modules/zuora/zuoraClient');

const mockScrubPaymentMethod = jest.mocked(scrubPaymentMethod);
const mockGetPaymentMethods = jest.mocked(getPaymentMethods);
const mockGetSubscriptions = jest.mocked(getSubscriptionsByAccountNumber);

const zuoraClient = {} as ZuoraClient;

const item: PaymentMethodToScrub = {
	payment_method_id: 'pm-1',
	account_id: 'acc-id-1',
	account_number: 'A-S00000001',
};

const cancelledSubscription = { status: 'Cancelled' };
const activeSubscription = { status: 'Active' };

const creditCard = (overrides: Record<string, unknown> = {}) => ({
	id: 'pm-1',
	status: 'Active',
	...overrides,
});

const paymentMethodsResponse = (overrides: Record<string, unknown> = {}) => ({
	defaultPaymentMethodId: 'pm-1',
	paymentGateway: 'Stripe PaymentIntents GNM Membership',
	creditcard: [creditCard()],
	...overrides,
});

beforeEach(() => {
	jest.resetAllMocks();
	mockGetSubscriptions.mockResolvedValue([cancelledSubscription]);
	mockGetPaymentMethods.mockResolvedValue(paymentMethodsResponse());
});

describe('processPaymentMethod', () => {
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
			paymentMethodsResponse({ defaultPaymentMethodId: 'pm-1' }),
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
		// A scrubbed payment method stops being returned by Zuora at all, which
		// is what makes the job idempotent.
		mockGetPaymentMethods.mockResolvedValue(
			paymentMethodsResponse({ creditcard: [] }),
		);

		const outcome = await processPaymentMethod({
			zuoraClient,
			item,
			dryRun: false,
		});

		expect(outcome).toBe('skipped');
		expect(mockScrubPaymentMethod).not.toHaveBeenCalled();
	});

	it('skips a card that is no longer Active', async () => {
		mockGetPaymentMethods.mockResolvedValue(
			paymentMethodsResponse({
				creditcard: [creditCard({ status: 'Closed' })],
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
});

describe('handler', () => {
	const second: PaymentMethodToScrub = {
		payment_method_id: 'pm-2',
		account_id: 'acc-id-2',
		account_number: 'A-S00000002',
	};

	beforeEach(() => {
		process.env.STAGE = 'CODE';
		delete process.env.DRY_RUN;
		jest.mocked(ZuoraClient).create.mockResolvedValue(zuoraClient);
	});

	it('rethrows when an item fails, so the distributed map records it', async () => {
		// Swallowing failures here would leave the map's result file empty, so
		// CheckForFailures would never fire and neither would the alarm.
		mockGetSubscriptions
			.mockResolvedValueOnce([cancelledSubscription])
			.mockRejectedValueOnce(new Error('Zuora is having a moment'));

		await expect(handler({ Items: [item, second] })).rejects.toThrow('pm-2');

		// The first item still went through before the second one blew up.
		expect(mockScrubPaymentMethod).toHaveBeenCalledWith(zuoraClient, 'pm-1');
	});

	it('reports counts and does not throw when every item is handled', async () => {
		const result = await handler({ Items: [item] });

		expect(result).toEqual({ scrubbed: 1, wouldScrub: 0, skipped: 0 });
	});

	it('counts a dry run separately from a real scrub', async () => {
		process.env.DRY_RUN = 'true';

		const result = await handler({ Items: [item] });

		expect(result).toEqual({ scrubbed: 0, wouldScrub: 1, skipped: 0 });
		expect(mockScrubPaymentMethod).not.toHaveBeenCalled();
	});
});
