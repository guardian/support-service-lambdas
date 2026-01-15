import type { BillingPeriod } from '@modules/billingPeriod';
import {
	CommonRatePlan,
	CommonRatePlanCharge,
} from '@modules/product-catalog/productCatalog';
import { objectEntries, objectValues } from '@modules/objectFunctions';
import {
	getIfNonEmpty,
	getSingleOrThrow,
	partition,
} from '@modules/arrayFunctions';
// import type { IsoCurrency } from '@modules/internationalisation/currency';
// import { getIfDefined } from '@modules/nullAndUndefined';
// import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
// import {
// 	SwitchableProduct,
// 	ValidTargetBillingPeriod,
// 	ValidTargetProduct,
// } from './validSwitches';

export type CatalogInformation = {
	targetProduct: {
		productRatePlanId: string;
		baseChargeIds: string[]; // used to find the price and service end date (next payment date) from the preview invoice, also to find and adjust out any charge less than 0.50
		contributionChargeId?: string; // used to find the price from the preview invoice as above, also to do the chargeOverrides in the order to set the additional amount to take
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

export function buildTargetProduct(targetProductRatePlan: CommonRatePlan) {
	const charges: CommonRatePlan['charges'] = targetProductRatePlan.charges;
	const chargesNameId: Array<
		[keyof CommonRatePlan['charges'], CommonRatePlanCharge]
	> = objectEntries(charges);
	const [contributionChargeId, nonContributionCharges] = partition(
		chargesNameId,
		([productKey]) => productKey === 'Contribution',
	);
	const targetProduct1 = {
		productRatePlanId: targetProductRatePlan.id,
		baseChargeIds: nonContributionCharges.map((c) => c[1].id),
		contributionChargeId: getSingleOrThrow(
			contributionChargeId,
			(msg) => new Error(`multiple contribution charges! ${msg}`),
		)[1].id,
	};
	return targetProduct1;
}

export function buildSourceProduct(guardianProductRatePlan: CommonRatePlan) {
	return {
		productRatePlanId: guardianProductRatePlan.id,
		chargeIds: getIfNonEmpty(
			objectValues(guardianProductRatePlan.charges).map(
				(charge: CommonRatePlanCharge) => charge.id,
			),
			'charges are missing from the catalog TODO can we move this check upstream?',
		),
	};
}

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
