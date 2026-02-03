import { getIfDefined } from '@modules/nullAndUndefined';
import { logger } from '@modules/routing/logger';
import { zuoraSubscriptionSchema } from '@modules/zuora/types';
import dayjs from 'dayjs';
import zuoraCatalogFixture from '../../../../../modules/zuora-catalog/test/fixtures/catalog-prod.json';
import type { GuardianSubscription } from '../../../src/guardianSubscription/getSinglePlanFlattenedSubscriptionOrThrow';
import { getSinglePlanFlattenedSubscriptionOrThrow } from '../../../src/guardianSubscription/getSinglePlanFlattenedSubscriptionOrThrow';
import type { GuardianSubscriptionMultiPlan } from '../../../src/guardianSubscription/guardianSubscriptionParser';
import { GuardianSubscriptionParser } from '../../../src/guardianSubscription/guardianSubscriptionParser';
import { SubscriptionFilter } from '../../../src/guardianSubscription/subscriptionFilter';
import alreadySwitchedJson from '../../fixtures/already-switched-subscription.json';
import subscriptionJson from '../../fixtures/subscription.json';
import { productCatalog } from '../../productCatalogFixture';

const referenceDate = dayjs('2024-05-10');
const subscriptionFixture = zuoraSubscriptionSchema.parse(subscriptionJson);
const alreadySwitchedFixture =
	zuoraSubscriptionSchema.parse(alreadySwitchedJson);
const guardianSubscriptionParser = new GuardianSubscriptionParser(
	zuoraCatalogFixture,
	productCatalog,
);

describe('getSinglePlanFlattenedSubscriptionOrThrow', () => {
	test('returns flattened subscription with product catalog keys for valid contribution', () => {
		const guardianSubscription =
			guardianSubscriptionParser.toGuardianSubscription(subscriptionFixture);
		const filter =
			SubscriptionFilter.activeNonEndedSubscriptionFilter(referenceDate);
		const filteredSubscription =
			filter.filterSubscription(guardianSubscription);

		const subscription: GuardianSubscription =
			getSinglePlanFlattenedSubscriptionOrThrow(filteredSubscription);

		logger.log('subscription.ratePlan', subscription.ratePlan);
		expect(subscription.ratePlan).toBeDefined();
		expect(subscription.ratePlan.productName).toBe('Contributor');
		if (
			subscription.ratePlan.productKey !== 'Contribution' ||
			subscription.ratePlan.productRatePlanKey !== 'Annual'
		) {
			throw new Error('invalid value');
		}
		expect(
			subscription.ratePlan.ratePlanCharges.Contribution
				.productRatePlanChargeId,
		).toBe(
			productCatalog.Contribution.ratePlans.Annual.charges.Contribution.id,
		);
	});

	test('returns flattened subscription with product catalog keys for a post switch contribution->s+', () => {
		const postSwitchReferenceDate = dayjs('2024-06-10');
		const guardianSubscription =
			guardianSubscriptionParser.toGuardianSubscription(alreadySwitchedFixture);
		const filter = SubscriptionFilter.activeNonEndedSubscriptionFilter(
			postSwitchReferenceDate,
		);
		const filteredSubscription =
			filter.filterSubscription(guardianSubscription);

		const subscription: GuardianSubscription =
			getSinglePlanFlattenedSubscriptionOrThrow(filteredSubscription);

		expect(subscription.ratePlan).toBeDefined();
		expect(subscription.ratePlan.productName).toBe('Supporter Plus');
		if (
			subscription.ratePlan.productKey !== 'SupporterPlus' ||
			subscription.ratePlan.productRatePlanKey !== 'Monthly'
		) {
			throw new Error('invalid value');
		}
		expect(
			subscription.ratePlan.ratePlanCharges.Contribution
				.productRatePlanChargeId,
		).toBe(
			productCatalog.SupporterPlus.ratePlans.Monthly.charges.Contribution.id,
		);
		expect(
			subscription.ratePlan.ratePlanCharges.Subscription
				.productRatePlanChargeId,
		).toBe(
			productCatalog.SupporterPlus.ratePlans.Monthly.charges.Subscription.id,
		);
	});

	test('extracts correct subscription metadata from a contribution', () => {
		const guardianSubscription =
			guardianSubscriptionParser.toGuardianSubscription(subscriptionFixture);
		const filter =
			SubscriptionFilter.activeNonEndedSubscriptionFilter(referenceDate);
		const filteredSubscription =
			filter.filterSubscription(guardianSubscription);

		const subscription =
			getSinglePlanFlattenedSubscriptionOrThrow(filteredSubscription);

		expect(subscription.subscriptionNumber).toBe(
			subscriptionFixture.subscriptionNumber,
		);
		expect(subscription.accountNumber).toBe(subscriptionFixture.accountNumber);
		expect(subscription.status).toBe(subscriptionFixture.status);
	});

	test('extracts correct subscription metadata from a contribution', () => {
		const guardianSubscription =
			guardianSubscriptionParser.toGuardianSubscription(subscriptionFixture);
		const filter =
			SubscriptionFilter.activeNonEndedSubscriptionFilter(referenceDate);
		const filteredSubscription =
			filter.filterSubscription(guardianSubscription);

		const subscription =
			getSinglePlanFlattenedSubscriptionOrThrow(filteredSubscription);

		expect(subscription.subscriptionNumber).toBe(
			subscriptionFixture.subscriptionNumber,
		);
		expect(subscription.accountNumber).toBe(subscriptionFixture.accountNumber);
		expect(subscription.status).toBe(subscriptionFixture.status);
	});

	test('throws error when subscription has no rate plans', () => {
		const emptySubscription: GuardianSubscriptionMultiPlan = {
			contractEffectiveDate: new Date('2024-01-01'),
			customerAcceptanceDate: new Date('2024-01-01'),
			id: '',
			lastBookingDate: new Date('2024-01-01'),
			serviceActivationDate: new Date('2024-01-01'),
			subscriptionEndDate: new Date('2024-01-01'),
			subscriptionStartDate: new Date('2024-01-01'),
			termEndDate: new Date('2024-01-01'),
			subscriptionNumber: 'A-S00000001',
			accountNumber: 'A00000001',
			status: 'Active',
			termStartDate: new Date('2024-01-01'),
			ratePlans: [],
			productsNotInCatalog: [],
		};

		expect(() =>
			getSinglePlanFlattenedSubscriptionOrThrow(emptySubscription),
		).toThrow();
	});

	test('throws error when subscription has multiple rate plans', () => {
		const guardianSubscription =
			guardianSubscriptionParser.toGuardianSubscription(subscriptionFixture);
		const filter =
			SubscriptionFilter.activeNonEndedSubscriptionFilter(referenceDate);
		const filteredSubscription =
			filter.filterSubscription(guardianSubscription);

		// Duplicate the rate plan to simulate multiple plans
		const multiPlanSubscription: GuardianSubscriptionMultiPlan = {
			...filteredSubscription,
			ratePlans: [
				getIfDefined(
					filteredSubscription.ratePlans[0],
					'test sub has no rateplans',
				),
				getIfDefined(
					filteredSubscription.ratePlans[0],
					'test sub has no rateplans',
				),
			],
		};

		expect(() =>
			getSinglePlanFlattenedSubscriptionOrThrow(multiPlanSubscription),
		).toThrow();
	});

	test('includes rate plan charges in the flattened subscription', () => {
		const guardianSubscription =
			guardianSubscriptionParser.toGuardianSubscription(subscriptionFixture);
		const filter =
			SubscriptionFilter.activeNonEndedSubscriptionFilter(referenceDate);
		const filteredSubscription =
			filter.filterSubscription(guardianSubscription);

		const subscription =
			getSinglePlanFlattenedSubscriptionOrThrow(filteredSubscription);

		const charges = Object.values(subscription.ratePlan.ratePlanCharges);
		expect(charges.length).toBeGreaterThan(0);
		expect(charges[0]).toHaveProperty('productRatePlanChargeId');
		expect(charges[0]).toHaveProperty('price');
	});
});
