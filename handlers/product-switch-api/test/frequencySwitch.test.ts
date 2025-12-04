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
				productRatePlanId: ratePlanId,
				ratePlanName: 'Monthly',
				ratePlanCharges: [
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

	test('finds single active annual recurring subscription charge', () => {
		const subscription = makeSubscriptionWithSingleCharge('Annual', 120);
		const today = dayjs();
		const account = makeAccount();
		const { charge } = selectCandidateSubscriptionCharge(
			subscription,
			today.toDate(),
			account,
			productCatalog,
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
		const account = makeAccount();
		expect(() =>
			selectCandidateSubscriptionCharge(
				subscription,
				new Date(),
				account,
				productCatalog,
			),
		).toThrow('Subscription has no rate plans');
	});

	test('throws when charge name is not "Subscription"', () => {
		const subscription = makeSubscriptionWithSingleCharge('Month', 10, {
			chargeName: 'One-time charge',
		});
		const account = makeAccount();
		expect(() =>
			selectCandidateSubscriptionCharge(
				subscription,
				new Date(),
				account,
				productCatalog,
			),
		).toThrow(
			'Subscription charge must have a name of Subscription but name is One-time charge',
		);
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
		).toThrow('Subscription charge must have a type of Recurring');
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
		).toThrow('Subscription rate plan lastChangeType cannot be Remove');
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
		).toThrow('Subscription must be paid up to date');
	});

	test('throws when account has negative credit balance exceeding threshold', () => {
		const now = dayjs();
		const subscription = makeSubscriptionWithSingleCharge('Month', 10);
		const account = makeAccount({ creditBalance: -6 });
		expect(() =>
			selectCandidateSubscriptionCharge(
				subscription,
				now.toDate(),
				account,
				productCatalog,
			),
		).toThrow('Subscription must be paid up to date');
	});

	test('allows small negative credit balance within threshold', () => {
		const now = dayjs();
		const subscription = makeSubscriptionWithSingleCharge('Month', 10);
		const account = makeAccount({ creditBalance: -3 });
		expect(() =>
			selectCandidateSubscriptionCharge(
				subscription,
				now.toDate(),
				account,
				productCatalog,
			),
		).toThrow('Subscription must be paid up to date');
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

	test('includes charges with null effectiveEndDate', () => {
		const now = dayjs();
		const subscription = makeSubscriptionWithSingleCharge('Month', 10);
		// Set effectiveEndDate to null in the subscription
		const charge = subscription.ratePlans[0]!.ratePlanCharges[0]!;
		Object.assign(charge, { effectiveEndDate: null });
		const account = makeAccount();
		const result = selectCandidateSubscriptionCharge(
			subscription,
			now.toDate(),
			account,
			productCatalog,
		);
		expect(result.charge.effectiveEndDate).toBeNull();
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
		).toThrow('Subscription charge must be before its end date');
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
		).toThrow('No matching subscription charge found');
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
