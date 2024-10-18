import type { BillingPeriod } from '@modules/billingPeriod';
import type {
	ProductCatalog,
	ProductCurrency,
} from '@modules/product-catalog/productCatalog';

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
	currency: ProductCurrency<'SupporterPlus'>,
): CatalogInformation => {
	const catalogBillingPeriod = getCatalogBillingPeriod(billingPeriod);
	return {
		supporterPlus: {
			price:
				productCatalog.SupporterPlus.ratePlans[catalogBillingPeriod].pricing[
					currency
				],
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
