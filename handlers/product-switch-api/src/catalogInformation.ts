import type { BillingPeriod } from '@modules/utils/billingPeriod';
import type { Currency } from '@modules/internationalisation/currency';
import { getIfDefined } from '@modules/utils/nullAndUndefined';
import type { ProductCatalog } from '@modules/product-catalog/productCatalog';

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

const getCatalogBillingPeriod = (billingPeriod: BillingPeriod) => {
	if (billingPeriod == 'Annual') {
		return 'Annual';
	} else if (billingPeriod == 'Month') {
		return 'Monthly';
	}
	throw new Error(`Unsupported billing period ${billingPeriod}`);
};

export const getCatalogInformation = (
	productCatalog: ProductCatalog,
	billingPeriod: BillingPeriod,
	currency: Currency,
): CatalogInformation => {
	const catalogBillingPeriod = getCatalogBillingPeriod(billingPeriod);
	const price = getIfDefined(
		productCatalog.SupporterPlus.ratePlans[catalogBillingPeriod].pricing[
			currency
		],
		'No Supporter Plus price defined for currency',
	);
	return {
		supporterPlus: {
			price,
			productRatePlanId:
				productCatalog.SupporterPlus.ratePlans[catalogBillingPeriod].id,
			subscriptionChargeId:
				productCatalog.SupporterPlus.ratePlans[catalogBillingPeriod].charges
					.Subscription.id,
			contributionChargeId:
				productCatalog.SupporterPlus.ratePlans[catalogBillingPeriod].charges
					.Contribution.id,
		},
		contribution: {
			productRatePlanId:
				productCatalog.Contribution.ratePlans[catalogBillingPeriod].id,
			chargeId:
				productCatalog.Contribution.ratePlans[catalogBillingPeriod].charges
					.Contribution.id,
		},
	};
};
