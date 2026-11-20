import { subscriptionNumberSchema } from '@modules/zuora/identifiers';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { getCancellationReason } from '../../../src/refund/handlers/getCancellationReason';
import { getSubscriptionCancellation } from '../../../src/refund/zuora/subscriptionCancellation';

jest.mock('../../../src/refund/zuora/subscriptionCancellation');

const zuoraClient = {} as ZuoraClient;
const input = {
	subscriptionNumber: subscriptionNumberSchema.parse('A-S00123456'),
};

describe('getCancellationReason', () => {
	it('returns only the reasons that are set', async () => {
		jest.mocked(getSubscriptionCancellation).mockResolvedValue({
			status: 'Cancelled',
			UserCancellationReason__c: 'mma_other',
			CancellationReason__c: null,
		});

		expect(await getCancellationReason(zuoraClient, input)).toEqual({
			UserCancellationReason__c: 'mma_other',
		});
	});

	it('throws if the subscription is not cancelled, as it has no reasons to read', async () => {
		jest
			.mocked(getSubscriptionCancellation)
			.mockResolvedValue({ status: 'Active' });

		await expect(getCancellationReason(zuoraClient, input)).rejects.toThrow(
			'Subscription is Active, expected Cancelled',
		);
	});
});
