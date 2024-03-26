import type { BillingPeriod } from '@modules/billingPeriod';
import { checkDefined } from '@modules/nullAndUndefined';
import { prettyPrint } from '@modules/prettyPrint';
import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import type { ZuoraSubscription } from '@modules/zuora/zuoraSchemas';

export type CatalogIds = {
	contributionProductRatePlanId: string;
	supporterPlusProductRatePlanId: string;
	contributionChargeId: string;
	supporterPlusChargeId: string;
};
const getFirstContributionRatePlan = (
	productCatalog: ProductCatalog,
	subscription: ZuoraSubscription,
) => {
	const contributionProductRatePlanIds = [
		productCatalog.Contribution.ratePlans.Annual.id,
		productCatalog.Contribution.ratePlans.Monthly.id,
	];
	return checkDefined(
		subscription.ratePlans.find(
			(ratePlan) =>
				ratePlan.lastChangeType !== 'Remove' &&
				contributionProductRatePlanIds.includes(ratePlan.productRatePlanId),
		),
		`No contribution rate plan found in the subscription ${prettyPrint(
			subscription,
		)}`,
	);
};
export const getBillingPeriodFromSubscription = (
	productCatalog: ProductCatalog,
	subscription: ZuoraSubscription,
) => {
	const contributionProductRatePlan = getFirstContributionRatePlan(
		productCatalog,
		subscription,
	);
	return checkDefined(
		contributionProductRatePlan.ratePlanCharges[0]?.billingPeriod,
		`No rate plan charge found on the rate plan ${prettyPrint(
			contributionProductRatePlan,
		)}`,
	);
};
export const getCatalogIds = (
	productCatalog: ProductCatalog,
	billingPeriod: BillingPeriod,
) => {
	switch (billingPeriod) {
		case 'Annual':
			return {
				contributionProductRatePlanId:
					productCatalog.Contribution.ratePlans.Annual.id,
				supporterPlusProductRatePlanId:
					productCatalog.SupporterPlus.ratePlans.Annual.id,
				contributionChargeId:
					productCatalog.Contribution.ratePlans.Annual.charges.Contribution.id,
				supporterPlusChargeId:
					productCatalog.SupporterPlus.ratePlans.Annual.charges.Subscription.id,
			};
		case 'Month':
			return {
				contributionProductRatePlanId:
					productCatalog.Contribution.ratePlans.Monthly.id,
				supporterPlusProductRatePlanId:
					productCatalog.SupporterPlus.ratePlans.Monthly.id,
				contributionChargeId:
					productCatalog.Contribution.ratePlans.Monthly.charges.Contribution.id,
				supporterPlusChargeId:
					productCatalog.SupporterPlus.ratePlans.Monthly.charges.Subscription
						.id,
			};
		default:
			throw new Error(`Unsupported billing period ${billingPeriod}`);
	}
};
