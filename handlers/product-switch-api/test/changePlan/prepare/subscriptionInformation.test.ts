import { mapValue } from '@modules/objectFunctions';
import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import {
	type ZuoraSubscription,
	zuoraSubscriptionSchema,
} from '@modules/zuora/types';
import { zuoraDateFormat } from '@modules/zuora/utils';
import dayjs from 'dayjs';
import zuoraCatalogFixture from '../../../../../modules/zuora-catalog/test/fixtures/catalog-prod.json';
import { getSubscriptionInformation } from '../../../src/changePlan/prepare/subscriptionInformation';
import { getSinglePlanFlattenedSubscriptionOrThrow } from '../../../src/guardianSubscription/getSinglePlanFlattenedSubscriptionOrThrow';
import { GuardianSubscriptionParser } from '../../../src/guardianSubscription/guardianSubscriptionParser';
import { SubscriptionFilter } from '../../../src/guardianSubscription/subscriptionFilter';
import alreadySwitchedJson from '../../fixtures/already-switched-subscription.json';
import subscriptionJson from '../../fixtures/subscription.json';

const productCatalog = generateProductCatalog(zuoraCatalogFixture);
const guardianSubscriptionParser = new GuardianSubscriptionParser(
	zuoraCatalogFixture,
	productCatalog,
);
export function loadSubscription(
	subscriptionData: unknown,
	referenceDate: dayjs.Dayjs,
) {
	const subscriptionFixture: ZuoraSubscription =
		zuoraSubscriptionSchema.parse(subscriptionData);
	const subscription = (() => {
		const guardianSubscription =
			guardianSubscriptionParser.toGuardianSubscription(subscriptionFixture);
		const filter =
			SubscriptionFilter.activeNonEndedSubscriptionFilter(referenceDate);
		return getSinglePlanFlattenedSubscriptionOrThrow(
			filter.filterSubscription(guardianSubscription),
		);
	})();
	return { subscriptionFixture, subscription };
}

describe('getSubscriptionInformation', () => {
	test('extracts subscription information from the guardian subscription fixture', () => {
		const { subscriptionFixture, subscription } = loadSubscription(
			subscriptionJson,
			dayjs('2024-05-10'),
		);

		const subscriptionInformation = getSubscriptionInformation(subscription);

		expect(
			mapValue(subscriptionInformation, 'chargedThroughDate', (d) =>
				d === undefined ? undefined : zuoraDateFormat(d),
			),
		).toStrictEqual({
			accountNumber: subscriptionFixture.accountNumber,
			subscriptionNumber: subscriptionFixture.subscriptionNumber,
			previousProductName: subscription.ratePlan.productName,
			previousRatePlanName: subscription.ratePlan.ratePlanName,
			previousAmount: 50, // EUR
			productRatePlanKey: subscription.ratePlan.productRatePlanKey,
			termStartDate: subscription.termStartDate,
			chargedThroughDate: '2025-05-09',
			productRatePlanId: subscription.ratePlan.productRatePlanId,
			chargeIds: [
				productCatalog.Contribution.ratePlans.Annual.charges.Contribution.id,
			],
		});
	});

	test('gets the charged through date correctly for a switched sub', () => {
		const { subscriptionFixture, subscription } = loadSubscription(
			alreadySwitchedJson,
			dayjs('2024-06-10'),
		);

		const subscriptionInformation = getSubscriptionInformation(subscription);

		expect(
			mapValue(subscriptionInformation, 'chargedThroughDate', (d) =>
				d === undefined ? undefined : zuoraDateFormat(d),
			),
		).toStrictEqual({
			accountNumber: subscriptionFixture.accountNumber,
			subscriptionNumber: subscriptionFixture.subscriptionNumber,
			previousProductName: subscription.ratePlan.productName,
			previousRatePlanName: subscription.ratePlan.ratePlanName,
			previousAmount: 17, // AUD
			productRatePlanKey: subscription.ratePlan.productRatePlanKey,
			termStartDate: subscription.termStartDate,
			chargedThroughDate: '2024-07-06', // it ignores the removed contribution charge
			productRatePlanId: subscription.ratePlan.productRatePlanId,
			chargeIds: [
				productCatalog.SupporterPlus.ratePlans.Monthly.charges.Contribution.id,
				productCatalog.SupporterPlus.ratePlans.Monthly.charges.Subscription.id,
			],
		});
	});
});
