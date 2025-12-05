/**
 * Unit tests for frequency switch functionality.
 * Tests the candidate selection logic and edge cases without external API calls.
 */
import type { ZuoraSubscription } from '@modules/zuora/types';
import dayjs from 'dayjs';
import { getCatalogRatePlanName } from '../src/catalogInformation';
import { selectCandidateSubscriptionCharge } from '../src/frequencySwitchEndpoint';
import { productCatalog } from './productCatalogFixture';

/**
 * Creates a minimal mock account object for testing payment status checks
 */
function makeAccount(overrides?: {
	totalInvoiceBalance?: number;
	creditBalance?: number;
	currency?: string;
}) {
	return {
		success: true,
		basicInfo: {
			id: 'basic-info-id',
			identityId: 'identity-123',
		},
		billingAndPayment: {
			currency: overrides?.currency ?? 'GBP',
			defaultPaymentMethodId: 'payment-method-123',
		},
		billToContact: {
			firstName: 'Test',
			lastName: 'Customer',
			workEmail: 'test@example.com',
		},
		metrics: {
			totalInvoiceBalance: overrides?.totalInvoiceBalance ?? 0,
			creditBalance: overrides?.creditBalance ?? 0,
			currency: overrides?.currency ?? 'GBP',
		},
	};
}

/**
 * Creates a minimal mock subscription object for testing frequency switch
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
		contributionAmount?: number;
	},
): ZuoraSubscription {
	const ratePlanId =
		billingPeriod === 'Month'
			? productCatalog.SupporterPlus.ratePlans.Monthly.id
			: productCatalog.SupporterPlus.ratePlans.Annual.id;
	const chargeId =
		billingPeriod === 'Month'
			? productCatalog.SupporterPlus.ratePlans.Monthly.charges.Subscription.id
			: productCatalog.SupporterPlus.ratePlans.Annual.charges.Subscription.id;
	const contributionChargeId =
		billingPeriod === 'Month'
			? productCatalog.SupporterPlus.ratePlans.Monthly.charges.Contribution.id
			: productCatalog.SupporterPlus.ratePlans.Annual.charges.Contribution.id;
	const now = dayjs();

	const effectiveEndDate =
		overrides?.effectiveEndDate ?? now.add(11, 'months').toDate();

	const charges = [
		{
			id: 'subChargeId',
			productRatePlanChargeId: chargeId,
			number: 'C-00001',
			name: overrides?.chargeName ?? 'Subscription',
			type: overrides?.chargeType ?? 'Recurring',
			model: 'FlatFee',
			currency: 'GBP',
			price: price,
			billingPeriod: billingPeriod,
			effectiveStartDate:
				overrides?.effectiveStartDate ?? now.subtract(1, 'month').toDate(),
			effectiveEndDate: effectiveEndDate,
			processedThroughDate: now.subtract(1, 'day').toDate(),
			chargedThroughDate:
				overrides?.chargedThroughDate !== undefined
					? overrides.chargedThroughDate
					: null,
			upToPeriodsType: null,
			upToPeriods: null,
			discountPercentage: null,
			billingPeriodAlignment: 'AlignToCharge' as const,
		},
	];

	charges.push({
		id: 'contributionChargeId',
		productRatePlanChargeId: contributionChargeId,
		number: 'C-00002',
		name: 'Contribution',
		type: 'Recurring',
		model: 'FlatFee',
		currency: 'GBP',
		price: overrides?.contributionAmount ?? 0,
		billingPeriod: billingPeriod,
		effectiveStartDate:
			overrides?.effectiveStartDate ?? now.subtract(1, 'month').toDate(),
		effectiveEndDate: effectiveEndDate,
		processedThroughDate: now.subtract(1, 'day').toDate(),
		chargedThroughDate:
			overrides?.chargedThroughDate !== undefined
				? overrides.chargedThroughDate
				: null,
		upToPeriodsType: null,
		upToPeriods: null,
		discountPercentage: null,
		billingPeriodAlignment: 'AlignToCharge' as const,
	});

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
				productRatePlanId: ratePlanId,
				ratePlanName: 'Monthly',
				ratePlanCharges: charges,
			},
		],
	};
}
describe('selectCandidateSubscriptionCharge', () => {
	test('finds single active monthly recurring subscription charge', () => {
		const subscription = makeSubscriptionWithSingleCharge('Month', 10);
		const today = dayjs();
		const account = makeAccount();
		const { charge, ratePlan } = selectCandidateSubscriptionCharge(
			subscription,
			today.toDate(),
			account,
			productCatalog,
		);
		expect(charge.name).toBe('Subscription');
		expect(charge.billingPeriod).toBe('Month');
		expect(charge.price).toBe(10);
		expect(ratePlan.id).toBe('rp-id-123');
	});

	test('throws when subscription is already Annual (only Monthly to Annual switches supported)', () => {
		const subscription = makeSubscriptionWithSingleCharge('Annual', 120);
		const today = dayjs();
		const account = makeAccount();
		expect(() =>
			selectCandidateSubscriptionCharge(
				subscription,
				today.toDate(),
				account,
				productCatalog,
			),
		).toThrow('SupporterPlus Monthly rate plan not found');
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
		const account = makeAccount();
		expect(() =>
			selectCandidateSubscriptionCharge(
				subscription,
				new Date(),
				account,
				productCatalog,
			),
		).toThrow('SupporterPlus Monthly rate plan not found');
	});

	test('throws when charge type is not "Recurring"', () => {
		const subscription = makeSubscriptionWithSingleCharge('Month', 10, {
			chargeType: 'OneTime',
		});
		const account = makeAccount();
		expect(() =>
			selectCandidateSubscriptionCharge(
				subscription,
				new Date(),
				account,
				productCatalog,
			),
		).toThrow('charge type is "OneTime", not "Recurring"');
	});

	test('throws when rate plan lastChangeType is "Remove"', () => {
		const subscription = makeSubscriptionWithSingleCharge('Month', 10, {
			lastChangeType: 'Remove',
		});
		const account = makeAccount();
		expect(() =>
			selectCandidateSubscriptionCharge(
				subscription,
				new Date(),
				account,
				productCatalog,
			),
		).toThrow('SupporterPlus Monthly rate plan not found');
	});

	test('throws when account has outstanding invoice balance', () => {
		const now = dayjs();
		const subscription = makeSubscriptionWithSingleCharge('Month', 10);
		const account = makeAccount({ totalInvoiceBalance: 50 });
		expect(() =>
			selectCandidateSubscriptionCharge(
				subscription,
				now.toDate(),
				account,
				productCatalog,
			),
		).toThrow('account balance is zero');
	});

	test('includes charges with chargedThroughDate in the future', () => {
		const now = dayjs();
		const subscription = makeSubscriptionWithSingleCharge('Month', 10, {
			chargedThroughDate: now.add(1, 'month').toDate(),
		});
		const account = makeAccount();
		const { charge } = selectCandidateSubscriptionCharge(
			subscription,
			now.toDate(),
			account,
			productCatalog,
		);
		expect(charge.id).toBe('subChargeId');
	});

	test('throws when charge has ended (effectiveEndDate is in past)', () => {
		const now = dayjs();
		const subscription = makeSubscriptionWithSingleCharge('Month', 10, {
			effectiveEndDate: now.subtract(1, 'day').toDate(),
		});
		const account = makeAccount();
		expect(() =>
			selectCandidateSubscriptionCharge(
				subscription,
				now.toDate(),
				account,
				productCatalog,
			),
		).toThrow('is in the past');
	});

	test('throws when subscription status is not Active', () => {
		const now = dayjs();
		const subscription = makeSubscriptionWithSingleCharge('Month', 10);
		subscription.status = 'Suspended';
		const account = makeAccount();
		expect(() =>
			selectCandidateSubscriptionCharge(
				subscription,
				now.toDate(),
				account,
				productCatalog,
			),
		).toThrow('subscription status is active');
	});

	test('throws when subscription has non-zero contribution amount', () => {
		const now = dayjs();
		const subscription = makeSubscriptionWithSingleCharge('Month', 12, {
			contributionAmount: 5,
		});
		const account = makeAccount();

		expect(() =>
			selectCandidateSubscriptionCharge(
				subscription,
				now.toDate(),
				account,
				productCatalog,
			),
		).toThrow(
			'subscription did not meet precondition <contribution amount is zero (non-zero contributions cannot be preserved during frequency switch)> (was contribution amount is 5)',
		);
	});

	test('allows subscription with zero contribution amount', () => {
		const now = dayjs();
		const subscription = makeSubscriptionWithSingleCharge('Month', 12);
		const account = makeAccount();

		const { charge } = selectCandidateSubscriptionCharge(
			subscription,
			now.toDate(),
			account,
			productCatalog,
		);
		expect(charge.name).toBe('Subscription');
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
