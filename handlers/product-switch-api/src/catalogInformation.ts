import type { BillingPeriod } from '@modules/billingPeriod';
import type { IsoCurrency } from '@modules/internationalisation/currency';
import { getIfDefined } from '@modules/nullAndUndefined';
import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import { SwitchableProduct, ValidTargetProduct } from './validSwitches';

export type CatalogInformation = {
	targetProduct: {
		catalogBasePrice: number;
		productRatePlanId: string;
		subscriptionChargeId: string; // used to find the price and service end date (next payment date) from the preview invoice, also to find and adjust out any charge less than 0.50
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

export const getCatalogInformation = (
	productCatalog: ProductCatalog,
	targetProduct: ValidTargetProduct,
	sourceProduct: SwitchableProduct,
	billingPeriod: BillingPeriod,
	currency: IsoCurrency,
): CatalogInformation => {
	const catalogBillingPeriod = getCatalogRatePlanName(billingPeriod);
	const sourceProductRatePlan =
		productCatalog[sourceProduct].ratePlans[catalogBillingPeriod];
	const targetProductRatePlan =
		productCatalog[targetProduct].ratePlans[catalogBillingPeriod];
	const price = getIfDefined(
		targetProductRatePlan.pricing[currency],
		'No Supporter Plus price defined for currency',
	);
	return {
		targetProduct: {
			catalogBasePrice: price,
			productRatePlanId: targetProductRatePlan.id,
			subscriptionChargeId: targetProductRatePlan.charges.Subscription.id,
			contributionChargeId: targetProductRatePlan.charges.Contribution.id,
		},
		sourceProduct: {
			productRatePlanId: sourceProductRatePlan.id,
			chargeIds: [sourceProductRatePlan.charges.Contribution.id],
		},
	};
};
