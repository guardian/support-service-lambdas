import { getSinglePlanFlattenedSubscriptionOrThrow } from '@modules/guardian-subscription/getSinglePlanFlattenedSubscriptionOrThrow';
import { GuardianSubscriptionParser } from '@modules/guardian-subscription/guardianSubscriptionParser';
import { SubscriptionFilter } from '@modules/guardian-subscription/subscriptionFilter';
import { mapOption } from '@modules/nullAndUndefined';
import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import {
	type ZuoraSubscription,
	zuoraSubscriptionSchema,
} from '@modules/zuora/types';
import { zuoraDateFormat } from '@modules/zuora/utils';
import { zuoraCatalogSchema } from '@modules/zuora-catalog/zuoraCatalogSchema';
import dayjs from 'dayjs';
import zuoraCatalogFixtureCode from '../../../../../modules/zuora-catalog/test/fixtures/catalog-code.json';
import zuoraCatalogFixtureProd from '../../../../../modules/zuora-catalog/test/fixtures/catalog-prod.json';
import type { SubscriptionInformation } from '../../../src/changePlan/prepare/subscriptionInformation';
import { getSubscriptionInformation } from '../../../src/changePlan/prepare/subscriptionInformation';
import type { ValidSwitchableRatePlanKey } from '../../../src/changePlan/prepare/switchCatalogHelper';
import alreadySwitchedJson from '../../fixtures/already-switched-subscription.json';
import pendingAmountChange from '../../fixtures/pendingAmountChange.json';
import subscriptionJson from '../../fixtures/subscription.json';

const productCatalogProd = generateProductCatalog(
	zuoraCatalogSchema.parse(zuoraCatalogFixtureProd),
);
const guardianSubscriptionParserProd = new GuardianSubscriptionParser(
	zuoraCatalogSchema.parse(zuoraCatalogFixtureProd),
	productCatalogProd,
);
const productCatalogCode = generateProductCatalog(
	zuoraCatalogSchema.parse(zuoraCatalogFixtureCode),
);
const guardianSubscriptionParserCode = new GuardianSubscriptionParser(
	zuoraCatalogSchema.parse(zuoraCatalogFixtureCode),
	productCatalogCode,
);
export function loadSubscription(
	subscriptionData: unknown,
	referenceDate: dayjs.Dayjs,
	guardianSubscriptionParser: GuardianSubscriptionParser = guardianSubscriptionParserProd,
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

		expect({
			...subscriptionInformation,
			chargedThroughDate: mapOption(
				subscriptionInformation.chargedThroughDate,
				zuoraDateFormat,
			),
		}).toStrictEqual({
			accountNumber: subscriptionFixture.accountNumber,
			subscriptionNumber: subscriptionFixture.subscriptionNumber,
			previousProductName: subscription.ratePlan.productName,
			previousRatePlanName: subscription.ratePlan.ratePlanName,
			previousAmount: 50, // EUR
			includesContribution: true,
			productRatePlanKey: subscription.ratePlan
				.productRatePlanKey as ValidSwitchableRatePlanKey,
			termStartDate: subscription.termStartDate,
			chargedThroughDate: '2025-05-09',
			ratePlanId: subscription.ratePlan.id,
			chargeIds: [
				productCatalogProd.Contribution.ratePlans.Annual.charges.Contribution
					.id,
			],
		} satisfies Omit<SubscriptionInformation, 'chargedThroughDate'> & {
			chargedThroughDate: string;
		});
	});

	test('gets the charged through date correctly for a switched sub', () => {
		const { subscriptionFixture, subscription } = loadSubscription(
			alreadySwitchedJson,
			dayjs('2024-06-10'),
		);

		const subscriptionInformation = getSubscriptionInformation(subscription);

		expect({
			...subscriptionInformation,
			chargedThroughDate: mapOption(
				subscriptionInformation.chargedThroughDate,
				zuoraDateFormat,
			),
		}).toStrictEqual({
			accountNumber: subscriptionFixture.accountNumber,
			subscriptionNumber: subscriptionFixture.subscriptionNumber,
			previousProductName: subscription.ratePlan.productName,
			previousRatePlanName: subscription.ratePlan.ratePlanName,
			previousAmount: 17, // AUD
			includesContribution: false,
			productRatePlanKey: subscription.ratePlan
				.productRatePlanKey as ValidSwitchableRatePlanKey,
			termStartDate: subscription.termStartDate,
			chargedThroughDate: '2024-07-06', // it ignores the removed contribution charge
			ratePlanId: subscription.ratePlan.id,
			chargeIds: [
				productCatalogProd.SupporterPlus.ratePlans.Monthly.charges.Contribution
					.id,
				productCatalogProd.SupporterPlus.ratePlans.Monthly.charges.Subscription
					.id,
			],
		} satisfies Omit<SubscriptionInformation, 'chargedThroughDate'> & {
			chargedThroughDate: string;
		});
	});

	test("gets the charged through date correctly where there's a pending amount change", () => {
		const { subscriptionFixture, subscription } = loadSubscription(
			pendingAmountChange,
			dayjs('2026-02-10'),
			guardianSubscriptionParserCode,
		);

		const subscriptionInformation = getSubscriptionInformation(subscription);

		expect({
			...subscriptionInformation,
			chargedThroughDate: mapOption(
				subscriptionInformation.chargedThroughDate,
				zuoraDateFormat,
			),
		}).toStrictEqual({
			accountNumber: subscriptionFixture.accountNumber,
			subscriptionNumber: subscriptionFixture.subscriptionNumber,
			previousProductName: subscription.ratePlan.productName,
			previousRatePlanName: subscription.ratePlan.ratePlanName,
			previousAmount: 17, // AUD
			includesContribution: true,
			productRatePlanKey: subscription.ratePlan
				.productRatePlanKey as ValidSwitchableRatePlanKey,
			termStartDate: subscription.termStartDate,
			chargedThroughDate: '2026-03-10', // it uses the effective start date of the contribution charge
			ratePlanId: subscription.ratePlan.id,
			chargeIds: [
				productCatalogCode.SupporterPlus.ratePlans.Monthly.charges.Contribution
					.id,
				productCatalogCode.SupporterPlus.ratePlans.Monthly.charges.Subscription
					.id,
			],
		} satisfies Omit<SubscriptionInformation, 'chargedThroughDate'> & {
			chargedThroughDate: string;
		});
	});
});
