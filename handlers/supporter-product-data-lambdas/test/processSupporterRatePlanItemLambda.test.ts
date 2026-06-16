import type { SupporterRatePlanItem } from '@modules/supporter-product-data/supporterProductData';
import dayjs from 'dayjs';
import { processItem } from '../src/handlers/processSupporterRatePlanItem';
import type { SecondaryUser } from '../src/services/secondaryUserService';

const item: SupporterRatePlanItem = {
	subscriptionName: 'sub-1',
	identityId: 'id-1',
	productRatePlanId: 'prp-1',
	productRatePlanName: 'plan-1',
	termEndDate: dayjs('2026-03-01'),
	contractEffectiveDate: dayjs('2026-02-01'),
};

const noSecondaryUsers = jest.fn(() => Promise.resolve([] as SecondaryUser[]));
const updateSecondaryItem = jest.fn(() => Promise.resolve());

describe('processSupporterRatePlanItemLambda', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('skips discount items', async () => {
		const writeItem = jest.fn(() => Promise.resolve());

		await processItem(item, {
			isDiscountRatePlanItem: (item) => item.productRatePlanId === 'prp-1',
			contributionIds: [],
			getSubscription: () =>
				Promise.resolve({ subscriptionNumber: 'sub-number', ratePlans: [] }),
			writeItem,
			getSecondaryUsers: noSecondaryUsers,
			updateSecondarySubscription: updateSecondaryItem,
		});

		expect(writeItem).not.toHaveBeenCalled();
		expect(noSecondaryUsers).not.toHaveBeenCalled();
		expect(updateSecondaryItem).not.toHaveBeenCalled();
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
				getSecondaryUsers: noSecondaryUsers,
				updateSecondarySubscription: updateSecondaryItem,
			},
		);

		expect(writeItem).toHaveBeenCalledWith({
			...item,
			productRatePlanId: 'contribution-product-rate-plan-id',
			contributionAmount: 10.0,
			contributionCurrency: 'GBP',
		});
	});

	test('does not update secondary items when there are none', async () => {
		const writeItem = jest.fn(() => Promise.resolve());

		await processItem(item, {
			isDiscountRatePlanItem: () => false,
			contributionIds: [],
			getSubscription: () =>
				Promise.resolve({ subscriptionNumber: 'sub-number', ratePlans: [] }),
			writeItem,
			getSecondaryUsers: noSecondaryUsers,
			updateSecondarySubscription: updateSecondaryItem,
		});

		expect(writeItem).toHaveBeenCalled();
		expect(noSecondaryUsers).toHaveBeenCalledWith('sub-1');
		expect(updateSecondaryItem).not.toHaveBeenCalled();
	});

	test('updates secondary items when present', async () => {
		const writeItem = jest.fn(() => Promise.resolve());
		const secondaryUsers: SecondaryUser[] = [
			{ subscriptionName: 'sub-1', secondaryIdentityId: 'secondary-id-1' },
			{ subscriptionName: 'sub-1', secondaryIdentityId: 'secondary-id-2' },
		];
		const getSecondaryUsers = jest.fn(() => Promise.resolve(secondaryUsers));

		await processItem(item, {
			isDiscountRatePlanItem: () => false,
			contributionIds: [],
			getSubscription: () =>
				Promise.resolve({ subscriptionNumber: 'sub-number', ratePlans: [] }),
			writeItem,
			getSecondaryUsers,
			updateSecondarySubscription: updateSecondaryItem,
		});

		expect(writeItem).toHaveBeenCalled();
		expect(getSecondaryUsers).toHaveBeenCalledWith('sub-1');
		expect(updateSecondaryItem).toHaveBeenCalledTimes(2);
		expect(updateSecondaryItem).toHaveBeenCalledWith(
			'secondary-id-1',
			'sub-1-secondary-id-1',
			expect.objectContaining({ subscriptionName: 'sub-1' }),
		);
		expect(updateSecondaryItem).toHaveBeenCalledWith(
			'secondary-id-2',
			'sub-1-secondary-id-2',
			expect.objectContaining({ subscriptionName: 'sub-1' }),
		);
	});
});
