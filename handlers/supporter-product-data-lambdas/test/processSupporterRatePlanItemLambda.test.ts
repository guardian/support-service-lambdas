import type { SupporterRatePlanItem } from '@modules/supporter-product-data/supporterProductData';
import dayjs from 'dayjs';
import { processItem } from '../src/handlers/processSupporterRatePlanItem';

const item: SupporterRatePlanItem = {
	subscriptionName: 'sub-1',
	identityId: 'id-1',
	productRatePlanId: 'prp-1',
	productRatePlanName: 'plan-1',
	termEndDate: dayjs('2026-03-01'),
	contractEffectiveDate: dayjs('2026-02-01'),
};

describe('processSupporterRatePlanItemLambda', () => {
	test('skips discount items', async () => {
		const writeItem = jest.fn(() => Promise.resolve());

		await processItem(item, {
			isDiscountRatePlanItem: (item) => item.productRatePlanId === 'prp-1',
			contributionIds: [],
			getSubscription: () =>
				Promise.resolve({ subscriptionNumber: 'sub-number', ratePlans: [] }),
			writeItem,
		});

		expect(writeItem).not.toHaveBeenCalled();
	});

	test('adds contribution amount for contribution plans', async () => {
		const writeItem = jest.fn(() => Promise.resolve());

		await processItem(
			{ ...item, productRatePlanId: 'contribution-product-rate-plan-id' },
			{
				isDiscountRatePlanItem: () => false,
				contributionIds: ['contribution-product-rate-plan-id'],
				getSubscription: () =>
					Promise.resolve({
						subscriptionNumber: 'sub-number',
						ratePlans: [
							{
								id: 'rate-plan-id',
								productRatePlanId: 'contribution-product-rate-plan-id',
								ratePlanCharges: [{ price: 10.0, currency: 'GBP' }],
							},
						],
					}),
				writeItem,
			},
		);

		expect(writeItem).toHaveBeenCalledWith({
			...item,
			productRatePlanId: 'contribution-product-rate-plan-id',
			contributionAmount: 10.0,
			contributionCurrency: 'GBP',
		});
	});
});
