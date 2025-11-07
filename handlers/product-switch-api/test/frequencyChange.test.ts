/**
 * Unit tests for frequency change functionality.
 * Tests the candidate selection logic and edge cases without external API calls.
 */
import type { ZuoraSubscription } from '@modules/zuora/types';
import dayjs from 'dayjs';
import { getCatalogRatePlanName } from '../src/catalogInformation';
import { selectCandidateSubscriptionCharge } from '../src/frequencyChange';

/**
 * Creates a minimal mock subscription object for testing frequency changes
 */
function makeSubscriptionWithSingleCharge(
	billingPeriod: 'Month' | 'Annual',
	price: number,
	overrides?: {
		chargedThroughDate?: Date | null;
		effectiveStartDate?: Date;
		effectiveEndDate?: Date;
		chargeName?: string;
		chargeType?: string;
		lastChangeType?: string;
	},
): ZuoraSubscription {
	const now = dayjs();
	return {
		id: 'sub-id-123',
		accountNumber: 'ACC123',
		subscriptionNumber: 'A-SUB123',
		status: 'Active',
		contractEffectiveDate: now.subtract(1, 'month').toDate(),
		serviceActivationDate: now.subtract(1, 'month').toDate(),
		customerAcceptanceDate: now.subtract(1, 'month').toDate(),
		subscriptionStartDate: now.subtract(1, 'month').toDate(),
		subscriptionEndDate: now.add(11, 'months').toDate(),
		lastBookingDate: now.subtract(1, 'month').toDate(),
		termStartDate: now.subtract(1, 'month').toDate(),
		termEndDate: now.add(11, 'months').toDate(),
		ratePlans: [
			{
				id: 'rp-id-123',
				lastChangeType: overrides?.lastChangeType ?? 'Add',
				productId: 'product-id-123',
				productName: 'Monthly Contribution',
				productRatePlanId: 'ratePlanId',
				ratePlanName: 'Monthly',
				ratePlanCharges: [
					{
						id: 'subChargeId',
						productRatePlanChargeId: 'prc-id-123',
						number: 'C-00001',
						name: overrides?.chargeName ?? 'Subscription',
						type: overrides?.chargeType ?? 'Recurring',
						model: 'FlatFee',
						currency: 'GBP',
						price: price,
						billingPeriod: billingPeriod,
						effectiveStartDate:
							overrides?.effectiveStartDate ??
							now.subtract(1, 'month').toDate(),
						effectiveEndDate:
							overrides?.effectiveEndDate ?? now.add(11, 'months').toDate(),
						processedThroughDate: now.subtract(1, 'day').toDate(),
						chargedThroughDate:
							overrides?.chargedThroughDate !== undefined
								? overrides.chargedThroughDate
								: null,
						upToPeriodsType: null,
						upToPeriods: null,
						discountPercentage: null,
						billingPeriodAlignment: 'AlignToCharge',
					},
				],
			},
		],
	};
}

describe('selectCandidateSubscriptionCharge', () => {
	test('finds single active monthly recurring subscription charge', () => {
		const subscription = makeSubscriptionWithSingleCharge('Month', 10);
		const today = dayjs();
		const { charge, ratePlan } = selectCandidateSubscriptionCharge(
			subscription,
			today.toDate(),
		);
		expect(charge.name).toBe('Subscription');
		expect(charge.billingPeriod).toBe('Month');
		expect(charge.price).toBe(10);
		expect(ratePlan.id).toBe('rp-id-123');
	});

	test('finds single active annual recurring subscription charge', () => {
		const subscription = makeSubscriptionWithSingleCharge('Annual', 120);
		const today = dayjs();
		const { charge } = selectCandidateSubscriptionCharge(
			subscription,
			today.toDate(),
		);
		expect(charge.name).toBe('Subscription');
		expect(charge.billingPeriod).toBe('Annual');
		expect(charge.price).toBe(120);
	});

	test('throws when subscription has no rate plans', () => {
		const now = dayjs();
		const subscription: ZuoraSubscription = {
			id: 'sub-id-123',
			accountNumber: 'ACC123',
			subscriptionNumber: 'A-SUB123',
			status: 'Active',
			contractEffectiveDate: now.subtract(1, 'month').toDate(),
			serviceActivationDate: now.subtract(1, 'month').toDate(),
			customerAcceptanceDate: now.subtract(1, 'month').toDate(),
			subscriptionStartDate: now.subtract(1, 'month').toDate(),
			subscriptionEndDate: now.add(11, 'months').toDate(),
			lastBookingDate: now.subtract(1, 'month').toDate(),
			termStartDate: now.subtract(1, 'month').toDate(),
			termEndDate: now.add(11, 'months').toDate(),
			ratePlans: [],
		};
		expect(() =>
			selectCandidateSubscriptionCharge(subscription, new Date()),
		).toThrow('No active recurring charges eligible for frequency change.');
	});

	test('throws when multiple eligible charges exist', () => {
		const subscription = makeSubscriptionWithSingleCharge('Month', 10);
		// Duplicate the rate plan to create multiple eligible charges
		subscription.ratePlans.push({
			...subscription.ratePlans[0]!,
			id: 'rp-id-456',
			ratePlanCharges: [
				{
					...subscription.ratePlans[0]!.ratePlanCharges[0]!,
					id: 'different-charge-id',
				},
			],
		});
		expect(() =>
			selectCandidateSubscriptionCharge(subscription, new Date()),
		).toThrow(
			'Multiple eligible charges found; cannot safely change frequency.',
		);
	});

	test('excludes rate plans with lastChangeType "Remove"', () => {
		const subscription = makeSubscriptionWithSingleCharge('Month', 10, {
			lastChangeType: 'Remove',
		});
		expect(() =>
			selectCandidateSubscriptionCharge(subscription, new Date()),
		).toThrow('No active recurring charges eligible for frequency change.');
	});

	test('excludes charges that are not named "Subscription"', () => {
		const subscription = makeSubscriptionWithSingleCharge('Month', 10, {
			chargeName: 'Contribution',
		});
		expect(() =>
			selectCandidateSubscriptionCharge(subscription, new Date()),
		).toThrow('No active recurring charges eligible for frequency change.');
	});

	test('excludes charges that are not type "Recurring"', () => {
		const subscription = makeSubscriptionWithSingleCharge('Month', 10, {
			chargeType: 'OneTime',
		});
		expect(() =>
			selectCandidateSubscriptionCharge(subscription, new Date()),
		).toThrow('No active recurring charges eligible for frequency change.');
	});

	test('excludes charges not yet effective (effectiveStartDate in future)', () => {
		const now = dayjs();
		const subscription = makeSubscriptionWithSingleCharge('Month', 10, {
			effectiveStartDate: now.add(1, 'month').toDate(),
		});
		expect(() =>
			selectCandidateSubscriptionCharge(subscription, now.toDate()),
		).toThrow('No active recurring charges eligible for frequency change.');
	});

	test('excludes charges that have ended (effectiveEndDate in past)', () => {
		const now = dayjs();
		const subscription = makeSubscriptionWithSingleCharge('Month', 10, {
			effectiveEndDate: now.subtract(1, 'day').toDate(),
		});
		expect(() =>
			selectCandidateSubscriptionCharge(subscription, now.toDate()),
		).toThrow('No active recurring charges eligible for frequency change.');
	});

	test('excludes charges with chargedThroughDate in the past', () => {
		const now = dayjs();
		const subscription = makeSubscriptionWithSingleCharge('Month', 10, {
			chargedThroughDate: now.subtract(1, 'day').toDate(),
		});
		expect(() =>
			selectCandidateSubscriptionCharge(subscription, now.toDate()),
		).toThrow('No active recurring charges eligible for frequency change.');
	});

	test('includes charges with chargedThroughDate in the future', () => {
		const now = dayjs();
		const subscription = makeSubscriptionWithSingleCharge('Month', 10, {
			chargedThroughDate: now.add(1, 'month').toDate(),
		});
		const { charge } = selectCandidateSubscriptionCharge(
			subscription,
			now.toDate(),
		);
		expect(charge.id).toBe('subChargeId');
	});

	test('includes charges with null chargedThroughDate', () => {
		const now = dayjs();
		const subscription = makeSubscriptionWithSingleCharge('Month', 10, {
			chargedThroughDate: null,
		});
		const { charge } = selectCandidateSubscriptionCharge(
			subscription,
			now.toDate(),
		);
		expect(charge.id).toBe('subChargeId');
	});
});

describe('getCatalogRatePlanName', () => {
	test('converts "Month" to "Monthly"', () => {
		expect(getCatalogRatePlanName('Month')).toBe('Monthly');
	});

	test('converts "Annual" to "Annual"', () => {
		expect(getCatalogRatePlanName('Annual')).toBe('Annual');
	});

	test('throws error for unsupported billing period', () => {
		const invalidPeriod = 'Quarter' as unknown as 'Month' | 'Annual';
		expect(() => getCatalogRatePlanName(invalidPeriod)).toThrow(
			'Unsupported billing period Quarter',
		);
	});
});
