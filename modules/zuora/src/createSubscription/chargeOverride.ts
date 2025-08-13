import { ProductCatalog } from '@modules/product-catalog/productCatalog';
import { ProductSpecificFields } from '@modules/zuora/createSubscription/productSpecificFields';

export const getChargeOverride = (
	productCatalog: ProductCatalog,
	productInformation: ProductSpecificFields,
): { productRatePlanChargeId: string; overrideAmount: number } | undefined => {
	if (productInformation.product === 'Contribution') {
		const chargeId =
			productCatalog.Contribution.ratePlans[productInformation.ratePlan].charges
				.Contribution.id;
		return {
			productRatePlanChargeId: chargeId,
			overrideAmount: productInformation.amount,
		};
	} else if (productInformation.product === 'SupporterPlus') {
		if (
			// TODO: Is this right?
			//These are the only rate plans that have a contribution charge
			productInformation.ratePlan === 'Annual' ||
			productInformation.ratePlan === 'Monthly'
		) {
			const chargeId =
				productCatalog.SupporterPlus.ratePlans[productInformation.ratePlan]
					.charges.Contribution.id;
			return {
				productRatePlanChargeId: chargeId,
				overrideAmount: productInformation.amount,
			};
		}
	}
	return;
};
