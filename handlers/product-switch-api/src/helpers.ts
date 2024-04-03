import type { BillingPeriod } from '@modules/billingPeriod';
import { checkDefined } from '@modules/nullAndUndefined';
import { prettyPrint } from '@modules/prettyPrint';
import type {
	ProductCatalog,
	ProductCurrency,
} from '@modules/product-catalog/productCatalog';
import type { ZuoraSubscription } from '@modules/zuora/zuoraSchemas';

export type CatalogInformation = {
	supporterPlusPrice: number;
	contributionProductRatePlanId: string;
	supporterPlusProductRatePlanId: string;
	contributionChargeId: string;
	supporterPlusChargeId: string;
};
export const getFirstContributionRatePlan = (
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

export const getCatalogInformation = (
	productCatalog: ProductCatalog,
	billingPeriod: BillingPeriod,
	currency: ProductCurrency<'SupporterPlus'>,
): CatalogInformation => {
	switch (billingPeriod) {
		case 'Annual':
			return {
				supporterPlusPrice:
					productCatalog.SupporterPlus.ratePlans.Annual.pricing[currency],
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
				supporterPlusPrice:
					productCatalog.SupporterPlus.ratePlans.Monthly.pricing[currency],
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
