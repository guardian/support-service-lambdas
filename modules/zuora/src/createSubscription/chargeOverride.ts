import { ValidationError } from '@modules/errors';
import type { IsoCurrency } from '@modules/internationalisation/currency';
import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import type { ProductPurchase } from '@modules/product-catalog/productPurchaseSchema';
import { getProductRatePlan } from '@modules/zuora/createSubscription/getProductRatePlan';

export const getChargeOverride = (
	productCatalog: ProductCatalog,
	productPurchase: ProductPurchase,
	currency: IsoCurrency,
): { productRatePlanChargeId: string; overrideAmount: number } | undefined => {
	if (productPurchase.product === 'Contribution') {
		const chargeId =
			productCatalog.Contribution.ratePlans[productPurchase.ratePlan].charges
				.Contribution.id;
		return {
			productRatePlanChargeId: chargeId,
			overrideAmount: productPurchase.amount,
		};
	} else if (productPurchase.product === 'SupporterPlus') {
		if (
			//These are the only rate plans that have a contribution charge
			productPurchase.ratePlan === 'Annual' ||
			productPurchase.ratePlan === 'Monthly'
		) {
			const chargeId =
				productCatalog.SupporterPlus.ratePlans[productPurchase.ratePlan].charges
					.Contribution.id;

			const contributionAmount =
				productPurchase.amount -
				getBaseProductPrice(productCatalog, productPurchase, currency);

			if (contributionAmount < 0) {
				throw new ValidationError(
					`The contribution amount of a supporter plus subscription cannot be less than zero, but here it would be ${contributionAmount}`,
				);
			}
			return {
				productRatePlanChargeId: chargeId,
				overrideAmount: contributionAmount,
			};
		}
	}
	return;
};

function getBaseProductPrice(
	productCatalog: ProductCatalog,
	productPurchase: ProductPurchase,
	currency: IsoCurrency,
) {
	const productRatePlan = getProductRatePlan(productCatalog, productPurchase);
	if (!(currency in productRatePlan.pricing)) {
		throw new ValidationError(`Currency ${currency} not supported in pricing`);
	}
	return productRatePlan.pricing[
		currency as keyof typeof productRatePlan.pricing
	];
}
