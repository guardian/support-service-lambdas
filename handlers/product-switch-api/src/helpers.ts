import type { BillingPeriod } from '@modules/billingPeriod';
import { checkDefined } from '@modules/nullAndUndefined';
import { prettyPrint } from '@modules/prettyPrint';
import type {
	ProductCatalog,
	ProductCurrency,
} from '@modules/product-catalog/productCatalog';
import type { ZuoraSubscription } from '@modules/zuora/zuoraSchemas';

export type CatalogInformation = {
	supporterPlus: {
		price: number;
		productRatePlanId: string;
		subscriptionChargeId: string;
		contributionChargeId: string;
	};
	contribution: {
		productRatePlanId: string;
		chargeId: string;
	};
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
				supporterPlus: {
					price:
						productCatalog.SupporterPlus.ratePlans.Annual.pricing[currency],
					productRatePlanId: productCatalog.SupporterPlus.ratePlans.Annual.id,
					subscriptionChargeId:
						productCatalog.SupporterPlus.ratePlans.Annual.charges.Subscription
							.id,
					contributionChargeId:
						productCatalog.SupporterPlus.ratePlans.Annual.charges.Contribution
							.id,
				},
				contribution: {
					productRatePlanId: productCatalog.Contribution.ratePlans.Annual.id,
					chargeId:
						productCatalog.Contribution.ratePlans.Annual.charges.Contribution
							.id,
				},
			};
		case 'Month':
			return {
				supporterPlus: {
					price:
						productCatalog.SupporterPlus.ratePlans.Monthly.pricing[currency],
					productRatePlanId: productCatalog.SupporterPlus.ratePlans.Monthly.id,
					subscriptionChargeId:
						productCatalog.SupporterPlus.ratePlans.Monthly.charges.Subscription
							.id,
					contributionChargeId:
						productCatalog.SupporterPlus.ratePlans.Monthly.charges.Contribution
							.id,
				},
				contribution: {
					productRatePlanId: productCatalog.Contribution.ratePlans.Monthly.id,
					chargeId:
						productCatalog.Contribution.ratePlans.Monthly.charges.Contribution
							.id,
				},
			};
		default:
			throw new Error(`Unsupported billing period ${billingPeriod}`);
	}
};
