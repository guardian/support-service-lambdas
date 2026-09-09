import { logger } from '@modules/logger/logger';
import type {
	ProductCatalogHelper,
	ProductKey,
} from '@modules/product-catalog/productCatalog';
import { addCatalogInformationToPromos } from '@modules/promotions/v2/addCatalogInformationToPromo';
import {
	getPromotions,
	getPromotionsByCodes,
} from '@modules/promotions/v2/getPromotions';
import { isActivePromo } from '@modules/promotions/v2/isActivePromo';
import type { PromoWithCatalogInformation } from '@modules/promotions/v2/schema';
import { buildErrorResponse, ok } from '@modules/routing/apiGatewayResponses';
import type { Stage } from '@modules/stage';

export type ListPromotionsFilters = {
	/**
	 * When provided, only return promotions whose active status (has started
	 * and, if it has an end date, has not yet ended) matches this value.
	 */
	active?: boolean;
	/**
	 * When provided, only return promotions that apply to this catalog
	 * ProductKey.
	 */
	productKey?: ProductKey;
	/**
	 * When provided (alongside productKey), only return promotions that apply
	 * to this catalog ProductRatePlanKey.
	 */
	productRatePlanKey?: string;
	/**
	 * When provided, only return promotions whose promoCode is in this list,
	 * fetched directly by key rather than scanning the whole table. Promo
	 * codes that don't exist are simply omitted from the response.
	 */
	promoCodes?: string[];
};

function catalogRatePlanMatchesFilters(
	catalogRatePlan: PromoWithCatalogInformation['appliesTo']['catalogRatePlans'][number],
	filters: ListPromotionsFilters,
): boolean {
	const matchesProductKey = catalogRatePlan.productKey === filters.productKey;
	const matchesProductRatePlanKey =
		filters.productRatePlanKey === undefined ||
		catalogRatePlan.productRatePlanKey === filters.productRatePlanKey;

	return matchesProductKey && matchesProductRatePlanKey;
}

function promoMatchesProductFilters(
	promo: PromoWithCatalogInformation,
	filters: ListPromotionsFilters,
): boolean {
	return promo.appliesTo.catalogRatePlans.some((catalogRatePlan) =>
		catalogRatePlanMatchesFilters(catalogRatePlan, filters),
	);
}

function filterByProduct(
	promotions: PromoWithCatalogInformation[],
	filters: ListPromotionsFilters,
): PromoWithCatalogInformation[] {
	if (filters.productKey === undefined) {
		return promotions;
	}
	return promotions.filter((promo) =>
		promoMatchesProductFilters(promo, filters),
	);
}

export async function listPromotionsEndpoint(
	stage: Stage,
	catalogHelper: ProductCatalogHelper,
	filters: ListPromotionsFilters = {},
) {
	try {
		const allPromotions =
			filters.promoCodes === undefined
				? await getPromotions(stage)
				: await getPromotionsByCodes(filters.promoCodes, stage);
		const promotions =
			filters.active === undefined
				? allPromotions
				: allPromotions.filter(
						(promo) => isActivePromo(promo) === filters.active,
					);
		const { succeeded, failed } = addCatalogInformationToPromos(
			promotions,
			catalogHelper,
		);

		if (failed.length > 0) {
			logger.log(
				`${failed.length} promotion(s) could not be resolved against the product catalog and were excluded from the response`,
				{ failedPromoCodes: failed.map((promo) => promo.promoCode) },
			);
		}

		return ok({ promotions: filterByProduct(succeeded, filters) });
	} catch (error) {
		logger.error('Error retrieving promotions', error);
		return buildErrorResponse(error);
	}
}
