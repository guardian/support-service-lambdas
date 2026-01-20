import type { BillingPeriod } from '@modules/billingPeriod';

export type CatalogInformation = {
	targetProduct: {
		productRatePlanId: string;
		baseChargeIds: string[]; // used to find the price and service end date (next payment date) from the preview invoice, also to find and adjust out any charge less than 0.50
		contributionChargeId: string | undefined; // used to find the price from the preview invoice as above, also to do the chargeOverrides in the order to set the additional amount to take
	};
	sourceProduct: {
		productRatePlanId: string;
		chargeIds: [string, ...string[]]; // needed to find the refund amount in the invoice (todo total it) and the charged through date (todo toSet it and check it's unique)
	};
};

export const getCatalogRatePlanName = (
	billingPeriod: BillingPeriod,
): 'Monthly' | 'Annual' => {
	if (billingPeriod == 'Annual') {
		return 'Annual';
	} else if (billingPeriod == 'Month') {
		return 'Monthly';
	}
	throw new Error(`Unsupported billing period ${billingPeriod}`);
};

// export function buildTargetProduct(ratePlan: TargetProductRatePlan) {
// 	const { Contribution, ...nonContributionCharges } = ratePlan.charges;
//
// 	return {
// 		productRatePlanId: ratePlan.id,
// 		baseChargeIds: objectValues(nonContributionCharges).flatMap((charge) =>
// 			charge !== undefined /*!*/ ? [charge.id] : [],
// 		),
// 		contributionChargeId: getIfDefined(
// 			Contribution,
// 			'missing contribution charge',
// 		).id,
// 	};
// }
//
// export type SourceProductRatePlan =
// 	| ProductRatePlan<'SupporterPlus', 'Monthly'>
// 	| ProductRatePlan<'Contribution', 'Monthly'>;
//
// export type TargetProductRatePlan =
// 	| ProductRatePlan<'SupporterPlus', 'Monthly'>
// 	| ProductRatePlan<'DigitalSubscription', 'Monthly'>;
// export function buildSourceProduct(
// 	sourceProductRatePlan: SourceProductRatePlan,
// ) {
// 	return {
// 		productRatePlanId: sourceProductRatePlan.id,
// 		chargeIds: getIfNonEmpty(
// 			objectValues(sourceProductRatePlan.charges).flatMap((charge) =>
// 				charge !== undefined /*!*/ ? [charge.id] : [],
// 			),
// 			'charges are missing from the catalog TODO can we move this check upstream?',
// 		),
// 	};
// }

// export const getCatalogInformation = (
// 	productCatalog: ProductCatalog,
// 	targetProduct: ValidTargetProduct,
// 	sourceProduct: SwitchableProduct,
// 	billingPeriod: ValidTargetBillingPeriod,
// 	currency: IsoCurrency,
// ): CatalogInformation => {
// 	const catalogBillingPeriod = getCatalogRatePlanName(billingPeriod);
// 	const sourceProductRatePlan =
// 		productCatalog[sourceProduct].ratePlans[catalogBillingPeriod];
// 	const targetProductRatePlan =
// 		productCatalog[targetProduct].ratePlans[catalogBillingPeriod];
// 	const price = getIfDefined(
// 		targetProductRatePlan.pricing[currency],
// 		'No Supporter Plus price defined for currency',
// 	);
// 	return {
// 		targetProduct: {
// 			catalogBasePrice: price,
// 			productRatePlanId: targetProductRatePlan.id,
// 			subscriptionChargeId: targetProductRatePlan.charges.Subscription.id,
// 			contributionChargeId: targetProductRatePlan.charges.Contribution.id,
// 		},
// 		sourceProduct: {
// 			productRatePlanId: sourceProductRatePlan.id,
// 			chargeIds: [sourceProductRatePlan.charges.Contribution.id],
// 		},
// 	};
// };
