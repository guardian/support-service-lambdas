import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import { ProductPurchase } from '@modules/product-catalog/productPurchaseSchema';

export const getChargeOverride = (
	productCatalog: ProductCatalog,
	productPurchase: ProductPurchase,
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
			// TODO: Is this right?
			//These are the only rate plans that have a contribution charge
			productPurchase.ratePlan === 'Annual' ||
			productPurchase.ratePlan === 'Monthly'
		) {
			const chargeId =
				productCatalog.SupporterPlus.ratePlans[productPurchase.ratePlan].charges
					.Contribution.id;
			return {
				productRatePlanChargeId: chargeId,
				overrideAmount: productPurchase.amount,
			};
		}
	}
	return;
};
