import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
import {
	type ZuoraSubscription,
	zuoraSubscriptionSchema,
} from '@modules/zuora/types';
import { zuoraCatalogSchema } from '@modules/zuora-catalog/zuoraCatalogSchema';
import dayjs from 'dayjs';
import zuoraCatalogFixture from '../../../../../modules/zuora-catalog/test/fixtures/catalog-prod.json';
import { getTargetInformation } from '../../../src/changePlan/prepare/targetInformation';
import { annualContribHalfPriceSupporterPlusForOneYear } from '../../../src/changePlan/switchDefinition/discounts';
import type { GuardianSubscription } from '../../../src/guardianSubscription/getSinglePlanFlattenedSubscriptionOrThrow';
import { getSinglePlanFlattenedSubscriptionOrThrow } from '../../../src/guardianSubscription/getSinglePlanFlattenedSubscriptionOrThrow';
import { GuardianSubscriptionParser } from '../../../src/guardianSubscription/guardianSubscriptionParser';
import { SubscriptionFilter } from '../../../src/guardianSubscription/subscriptionFilter';
import subscriptionJson from '../../fixtures/subscription.json';

const referenceDate = dayjs('2024-05-10');
const subscriptionFixture: ZuoraSubscription =
	zuoraSubscriptionSchema.parse(subscriptionJson);
const productCatalog = generateProductCatalog(
	zuoraCatalogSchema.parse(zuoraCatalogFixture),
);
const guardianSubscriptionParser = new GuardianSubscriptionParser(
	zuoraCatalogSchema.parse(zuoraCatalogFixture),
	productCatalog,
);
const productCatalogHelper = new ProductCatalogHelper(productCatalog);

const buildGuardianSubscriptionWithKeys = (): GuardianSubscription => {
	const guardianSubscription =
		guardianSubscriptionParser.toGuardianSubscription(subscriptionFixture);
	const filter =
		SubscriptionFilter.activeNonEndedSubscriptionFilter(referenceDate);
	return getSinglePlanFlattenedSubscriptionOrThrow(
		filter.filterSubscription(guardianSubscription),
	);
};

describe('getTargetInformation', () => {
	test('returns supporter plus target info for a valid contribution switch', async () => {
		const subscription = buildGuardianSubscriptionWithKeys();
		const previousAmount = 50;

		const targetInfo = await getTargetInformation(
			{
				mode: 'switchToBasePrice',
				targetProduct: 'SupporterPlus',
			},
			subscription.ratePlan,
			'EUR',
			previousAmount,
			false,
			productCatalogHelper,
		);

		const targetRatePlan = productCatalog.SupporterPlus.ratePlans.Annual;
		const expectedBasePrice = targetRatePlan.pricing.EUR;
		const expectedActualTotalPrice = Math.max(
			previousAmount,
			expectedBasePrice,
		);

		expect(targetInfo).toStrictEqual({
			actualTotalPrice: expectedActualTotalPrice,
			productRatePlanId: targetRatePlan.id,
			ratePlanName: 'Supporter Plus V2 - Annual',
			subscriptionChargeId: targetRatePlan.charges.Subscription.id,
			contributionCharge: {
				id: targetRatePlan.charges.Contribution.id,
				contributionAmount: expectedActualTotalPrice - expectedBasePrice,
			},
			discount: undefined,
		});
	});

	test('applies the supporter plus annual discount during save flows when eligible', async () => {
		const subscription = buildGuardianSubscriptionWithKeys();
		const targetRatePlan = productCatalog.SupporterPlus.ratePlans.Annual;
		const targetBasePrice = targetRatePlan.pricing.EUR;
		const discountedPrice = targetBasePrice / 2;
		const discountEligiblePreviousAmount = Math.min(50, discountedPrice);
		const targetInfo = await getTargetInformation(
			{
				mode: 'save',
				targetProduct: 'SupporterPlus',
			},
			subscription.ratePlan,
			'EUR',
			discountEligiblePreviousAmount,
			false,
			productCatalogHelper,
		);

		expect(targetInfo.actualTotalPrice).toBe(discountedPrice);
		expect(targetInfo.discount).toMatchObject({
			discountPercentage:
				annualContribHalfPriceSupporterPlusForOneYear.discountPercentage,
		});
		expect(targetInfo.contributionCharge?.contributionAmount).toBe(0);
	});

	test('throws when requesting a target product that is not a valid switch', () => {
		const subscription = buildGuardianSubscriptionWithKeys();

		expect(() =>
			getTargetInformation(
				{
					mode: 'switchToBasePrice',
					targetProduct: 'DigitalSubscription',
				},
				subscription.ratePlan,
				'EUR',
				50,
				false,
				productCatalogHelper,
			),
		).toThrow(ReferenceError);
	});
});
