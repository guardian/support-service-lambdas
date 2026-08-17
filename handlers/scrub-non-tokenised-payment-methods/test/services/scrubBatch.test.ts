/**
 * @group unit
 */
import type { Stage } from '@modules/stage';
import {
	getPaymentMethods,
	scrubPaymentMethod,
} from '@modules/zuora/paymentMethod';
import { getSubscriptionsByAccountNumber } from '@modules/zuora/subscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { scrubBatch } from '../../src/services';
import type { PaymentMethodToScrub } from '../../src/types';
import {
	cancelledSubscription,
	paymentMethodToScrubFixture as item,
	paymentMethodsResponseFixture,
} from '../fixtures';

jest.mock('@modules/zuora/paymentMethod');
jest.mock('@modules/zuora/subscription');
jest.mock('@modules/zuora/zuoraClient');

const mockScrubPaymentMethod = jest.mocked(scrubPaymentMethod);
const mockGetSubscriptions = jest.mocked(getSubscriptionsByAccountNumber);
const mockGetPaymentMethods = jest.mocked(getPaymentMethods);

const stage: Stage = 'CODE';

const secondItem: PaymentMethodToScrub = {
	payment_method_id: 'pm-2',
	account_id: 'acc-id-2',
	account_number: 'A-S00000002',
};

beforeEach(() => {
	jest.resetAllMocks();
	jest.mocked(ZuoraClient).create.mockResolvedValue({} as ZuoraClient);
	mockGetSubscriptions.mockResolvedValue([cancelledSubscription]);
	mockGetPaymentMethods.mockResolvedValue(paymentMethodsResponseFixture());
});

it('rethrows when an item fails, so the distributed map records it', async () => {
	// Swallowing failures here would leave the map's result file empty, so the
	// state machine's failure branch would never fire and neither would the
	// alarm.
	mockGetSubscriptions
		.mockResolvedValueOnce([cancelledSubscription])
		.mockRejectedValueOnce(new Error('Zuora is having a moment'));

	await expect(
		scrubBatch({ stage, items: [item, secondItem], dryRun: false }),
	).rejects.toThrow('pm-2');
});

it('reports counts and does not throw when every item is handled', async () => {
	const result = await scrubBatch({ stage, items: [item], dryRun: false });

	expect(result).toEqual({ scrubbed: 1, wouldScrub: 0, skipped: 0 });
});

it('counts a dry run separately from a real scrub', async () => {
	const result = await scrubBatch({ stage, items: [item], dryRun: true });

	expect(result).toEqual({ scrubbed: 0, wouldScrub: 1, skipped: 0 });
	expect(mockScrubPaymentMethod).not.toHaveBeenCalled();
});
