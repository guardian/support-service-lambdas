import { getIfDefined } from '@modules/nullAndUndefined';
import type {
	ProductCatalogHelper,
	ProductKey,
} from '@modules/product-catalog/productCatalog';
import type { Promo, PromoWithCatalogInformation } from './schema';

/**
 * Augments a promotion retrieved from Dynamo with the product catalog keys
 * (ProductKey + ProductRatePlanKey) it applies to, resolved from its raw
 * `productRatePlanIds`. Throws if any rate plan id cannot be resolved against
 * the product catalog, so that stale data is surfaced immediately.
 */
export const addCatalogInformationToPromo = (
	promo: Promo,
	catalogHelper: ProductCatalogHelper,
): PromoWithCatalogInformation => {
	const catalogRatePlans = promo.appliesTo.productRatePlanIds.map(
		(productRatePlanId) => {
			const productDetails = getIfDefined(
				catalogHelper.findProductDetails(productRatePlanId),
				`Promotion ${promo.promoCode} references product rate plan id ${productRatePlanId} which does not exist in the product catalog`,
			);
			// validateOrThrow returns a correlated GuardianCatalogKeys
			// (productKey constrained to its rate plan key) rather than the widened union
			// produced by findProductDetails.
			return catalogHelper.validateOrThrow(
				productDetails.zuoraProduct,
				productDetails.productRatePlan,
			);
		},
	);

	return {
		...promo,
		appliesTo: {
			...promo.appliesTo,
			catalogRatePlans,
		},
	};
};

export const addCatalogInformationToPromos = (
	promos: Promo[],
	catalogHelper: ProductCatalogHelper,
): PromoWithCatalogInformation[] =>
	promos.map((promo) => addCatalogInformationToPromo(promo, catalogHelper));

export const promoAppliesTo = (
	promo: PromoWithCatalogInformation,
	productKey: ProductKey,
	productRatePlanKey: string,
): boolean =>
	promo.appliesTo.catalogRatePlans.some(
		(catalogKey) =>
			catalogKey.productKey === productKey &&
			catalogKey.productRatePlanKey === productRatePlanKey,
	);

export const findPromosForProduct = (
	promos: PromoWithCatalogInformation[],
	productKey: ProductKey,
	productRatePlanKey: string,
): PromoWithCatalogInformation[] =>
	promos.filter((promo) =>
		promoAppliesTo(promo, productKey, productRatePlanKey),
	);
