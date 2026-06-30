import type { SecondaryUserRecord } from '@modules/multiple-account/secondaryUserRepository';
import { secondaryUserTTLFromPrimarySubscriptionTTL } from '@modules/multiple-account/secondaryUserRepository';
import type { SupporterRatePlanItem } from '@modules/supporter-product-data/supporterProductData';
import dayjs from 'dayjs';
import { processItem } from '../src/handlers/processSupporterRatePlanItem';

const termEndDate = '2026-03-01';
const item: SupporterRatePlanItem = {
	subscriptionName: 'sub-1',
	identityId: 'id-1',
	productRatePlanId: 'prp-1',
	productRatePlanName: 'plan-1',
	termEndDate: dayjs(termEndDate),
	contractEffectiveDate: dayjs('2025-03-01'),
};

const noSecondaryUsers = jest.fn(() =>
	Promise.resolve([] as SecondaryUserRecord[]),
);
const writeSecondaryItem = jest.fn(() => Promise.resolve());
const updateSecondaryUserTTL = jest.fn(() => Promise.resolve());

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
			writePrimaryItem: writeItem,
			getSecondaryUsers: noSecondaryUsers,
			writeSecondaryItem: writeSecondaryItem,
			updateSecondaryUserTTL: updateSecondaryUserTTL,
		});

		expect(writeItem).not.toHaveBeenCalled();
		expect(noSecondaryUsers).not.toHaveBeenCalled();
		expect(writeSecondaryItem).not.toHaveBeenCalled();
		expect(updateSecondaryUserTTL).not.toHaveBeenCalled();
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
				writePrimaryItem: writeItem,
				getSecondaryUsers: noSecondaryUsers,
				writeSecondaryItem: writeSecondaryItem,
				updateSecondaryUserTTL: updateSecondaryUserTTL,
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
			writePrimaryItem: writeItem,
			getSecondaryUsers: noSecondaryUsers,
			writeSecondaryItem: writeSecondaryItem,
			updateSecondaryUserTTL: updateSecondaryUserTTL,
		});

		expect(writeItem).toHaveBeenCalled();
		expect(noSecondaryUsers).toHaveBeenCalledWith('sub-1');
		expect(writeSecondaryItem).not.toHaveBeenCalled();
		expect(updateSecondaryUserTTL).not.toHaveBeenCalled();
	});

	test('updates secondary items when present', async () => {
		const writeItem = jest.fn(() => Promise.resolve());
		const secondaryUsers: SecondaryUserRecord[] = [
			{
				subscriptionName: 'sub-1',
				secondaryIdentityId: 'secondary-id-1',
				primaryIdentityId: 'primary-id-1',
				acceptedDate: '2026-01-01',
				expiryDate: dayjs('2026-01-01').add(2, 'weeks').unix(),
			},
			{
				subscriptionName: 'sub-1',
				secondaryIdentityId: 'secondary-id-2',
				primaryIdentityId: 'primary-id-1',
				acceptedDate: '2026-01-02',
				expiryDate: dayjs('2026-01-02').add(2, 'weeks').unix(),
			},
		];
		const getSecondaryUsers = jest.fn(() => Promise.resolve(secondaryUsers));

		await processItem(item, {
			isDiscountRatePlanItem: () => false,
			contributionIds: [],
			getSubscription: () =>
				Promise.resolve({ subscriptionNumber: 'sub-number', ratePlans: [] }),
			writePrimaryItem: writeItem,
			getSecondaryUsers,
			writeSecondaryItem: writeSecondaryItem,
			updateSecondaryUserTTL: updateSecondaryUserTTL,
		});

		expect(writeItem).toHaveBeenCalled();
		expect(getSecondaryUsers).toHaveBeenCalledWith('sub-1');
		expect(writeSecondaryItem).toHaveBeenCalledTimes(2);
		expect(writeSecondaryItem).toHaveBeenCalledWith(
			expect.objectContaining({ subscriptionName: 'sub-1' }),
			expect.objectContaining({ secondaryIdentityId: 'secondary-id-1' }),
		);
		expect(writeSecondaryItem).toHaveBeenCalledWith(
			expect.objectContaining({ subscriptionName: 'sub-1' }),
			expect.objectContaining({ secondaryIdentityId: 'secondary-id-2' }),
		);
		expect(updateSecondaryUserTTL).toHaveBeenCalledWith(
			expect.stringContaining('sub-1'),
			expect.stringContaining('secondary-id-1'),
			secondaryUserTTLFromPrimarySubscriptionTTL(dayjs(termEndDate)),
		);
		expect(updateSecondaryUserTTL).toHaveBeenCalledWith(
			expect.stringContaining('sub-1'),
			expect.stringContaining('secondary-id-2'),
			secondaryUserTTLFromPrimarySubscriptionTTL(dayjs(termEndDate)),
		);
	});
});
