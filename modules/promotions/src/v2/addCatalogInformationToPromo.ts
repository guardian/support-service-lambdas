import { logger } from '@modules/logger/logger';
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

/**
 * The result of resolving catalog information for a batch of promotions:
 * `succeeded` contains the enriched promos and `failed` contains the original
 * promos whose rate plan ids could not be resolved against the catalog.
 */
export type AddCatalogInformationResult = {
	succeeded: PromoWithCatalogInformation[];
	failed: Promo[];
};

export const addCatalogInformationToPromos = (
	promos: Promo[],
	catalogHelper: ProductCatalogHelper,
): AddCatalogInformationResult => {
	const succeeded: PromoWithCatalogInformation[] = [];
	const failed: Promo[] = [];

	for (const promo of promos) {
		try {
			succeeded.push(addCatalogInformationToPromo(promo, catalogHelper));
		} catch (error) {
			// Collect promos whose rate plan ids can't be resolved against the
			// catalog rather than failing the whole batch.
			logger.log(
				`Failed to resolve catalog information for promotion ${promo.promoCode}: ${String(error)}`,
			);
			failed.push(promo);
		}
	}

	return { succeeded, failed };
};

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
