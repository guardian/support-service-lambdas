import { processItem } from '../src/lambdas/processSupporterRatePlanItemLambda';
import type { SupporterRatePlanItem } from '../src/model/supporterRatePlanItem';

const item: SupporterRatePlanItem = {
	subscriptionName: 'sub-1',
	identityId: 'id-1',
	productRatePlanId: 'prp-1',
	productRatePlanName: 'plan-1',
	termEndDate: '2026-03-01',
	contractEffectiveDate: '2026-02-01',
};

describe('processSupporterRatePlanItemLambda', () => {
	test('skips discount items', async () => {
		const writeItem = jest.fn(() => Promise.resolve());

		await processItem(item, {
			discountIds: ['prp-1'],
			contributionIds: [],
			getSubscription: () => Promise.resolve({ ratePlans: [] }),
			writeItem,
			triggerDynamoWriteAlarm: () => Promise.resolve(),
		});

		expect(writeItem).not.toHaveBeenCalled();
	});

	test('adds contribution amount for contribution plans', async () => {
		const writeItem = jest.fn(() => Promise.resolve());

		await processItem(
			{ ...item, productRatePlanId: 'contrib-id' },
			{
				discountIds: [],
				contributionIds: ['contrib-id'],
				getSubscription: () =>
					Promise.resolve({
						ratePlans: [
							{
								id: 'contrib-id',
								ratePlanCharges: [{ price: '10.00', currency: 'GBP' }],
							},
						],
					}),
				writeItem,
				triggerDynamoWriteAlarm: () => Promise.resolve(),
			},
		);

		expect(writeItem).toHaveBeenCalledWith({
			...item,
			productRatePlanId: 'contrib-id',
			contributionAmount: { amount: '10.00', currency: 'GBP' },
		});
	});
});
