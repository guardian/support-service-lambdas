import { getIfDefined } from '@modules/nullAndUndefined';
import { zuoraSubscriptionSchema } from '@modules/zuora/types';
import dayjs from 'dayjs';
import zuoraCatalogFixture from '../../../../../modules/zuora-catalog/test/fixtures/catalog-prod.json';
import type { GuardianSubscription } from '../../../src/guardianSubscription/getSinglePlanFlattenedSubscriptionOrThrow';
import { getSinglePlanFlattenedSubscriptionOrThrow } from '../../../src/guardianSubscription/getSinglePlanFlattenedSubscriptionOrThrow';
import type { GuardianSubscriptionWithProducts } from '../../../src/guardianSubscription/guardianSubscriptionParser';
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
);

describe('getSinglePlanFlattenedSubscriptionOrThrow', () => {
	test('returns flattened subscription with product catalog keys for valid contribution', () => {
		const guardianSubscription =
			guardianSubscriptionParser.parse(subscriptionFixture);
		const filter =
			SubscriptionFilter.activeNonEndedSubscriptionFilter(referenceDate);
		const filteredSubscription =
			filter.filterSubscription(guardianSubscription);

		const subscription: GuardianSubscription =
			getSinglePlanFlattenedSubscriptionOrThrow(filteredSubscription);

		expect(subscription.ratePlan).toBeDefined();
		expect(subscription.ratePlan.productName).toBe('Contributor');
		expect(
			subscription.ratePlan.ratePlanCharges['Contribution']
				?.productRatePlanChargeId,
		).toBe(
			productCatalog.Contribution.ratePlans.Annual.charges.Contribution.id,
		);
		expect(subscription.ratePlan.productKey).toBe('Contribution');
		expect(subscription.ratePlan.productRatePlanKey).toBe('Annual');
	});

	test('returns flattened subscription with product catalog keys for a post switch contribution->s+', () => {
		const postSwitchReferenceDate = dayjs('2024-06-10');
		const guardianSubscription = guardianSubscriptionParser.parse(
			alreadySwitchedFixture,
		);
		const filter = SubscriptionFilter.activeNonEndedSubscriptionFilter(
			postSwitchReferenceDate,
		);
		const filteredSubscription =
			filter.filterSubscription(guardianSubscription);

		const subscription: GuardianSubscription =
			getSinglePlanFlattenedSubscriptionOrThrow(filteredSubscription);

		expect(subscription.ratePlan).toBeDefined();
		expect(subscription.ratePlan.productName).toBe('Supporter Plus');
		expect(
			subscription.ratePlan.ratePlanCharges['Contribution']
				?.productRatePlanChargeId,
		).toBe(
			productCatalog.SupporterPlus.ratePlans.Monthly.charges.Contribution.id,
		);
		expect(
			subscription.ratePlan.ratePlanCharges['Subscription']
				?.productRatePlanChargeId,
		).toBe(
			productCatalog.SupporterPlus.ratePlans.Monthly.charges.Subscription.id,
		);
		expect(subscription.ratePlan.productKey).toBe('SupporterPlus');
		expect(subscription.ratePlan.productRatePlanKey).toBe('Monthly');
	});

	test('extracts correct subscription metadata from a contribution', () => {
		const guardianSubscription =
			guardianSubscriptionParser.parse(subscriptionFixture);
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
			guardianSubscriptionParser.parse(subscriptionFixture);
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
		const emptySubscription: GuardianSubscriptionWithProducts = {
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
			products: {},
			productsNotInCatalog: {},
		};

		expect(() =>
			getSinglePlanFlattenedSubscriptionOrThrow(emptySubscription),
		).toThrow();
	});

	test('throws error when subscription has multiple rate plans', () => {
		const guardianSubscription =
			guardianSubscriptionParser.parse(subscriptionFixture);
		const filter =
			SubscriptionFilter.activeNonEndedSubscriptionFilter(referenceDate);
		const filteredSubscription =
			filter.filterSubscription(guardianSubscription);

		// Duplicate the rate plan to simulate multiple plans
		const multiPlanSubscription: GuardianSubscriptionWithProducts = {
			...filteredSubscription,
			products: {
				Contribution: {
					Annual: [
						...getIfDefined(
							filteredSubscription.products.Contribution?.Annual,
							"test sub isn't an annual contribution",
						),
						...getIfDefined(
							filteredSubscription.products.Contribution?.Annual,
							"test sub isn't an annual contribution",
						),
					],
					Monthly: [],
				},
			},
		};

		expect(() =>
			getSinglePlanFlattenedSubscriptionOrThrow(multiPlanSubscription),
		).toThrow();
	});

	test('includes rate plan charges in the flattened subscription', () => {
		const guardianSubscription =
			guardianSubscriptionParser.parse(subscriptionFixture);
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
