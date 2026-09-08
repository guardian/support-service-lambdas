import { logger } from '@modules/logger/logger';
import type { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
import { addCatalogInformationToPromos } from '@modules/promotions/v2/addCatalogInformationToPromo';
import { getPromotions } from '@modules/promotions/v2/getPromotions';
import { isActivePromo } from '@modules/promotions/v2/isActivePromo';
import { buildErrorResponse, ok } from '@modules/routing/apiGatewayResponses';
import type { Stage } from '@modules/stage';

export type ListPromotionsFilters = {
	/**
	 * When provided, only return promotions whose active status (has started
	 * and, if it has an end date, has not yet ended) matches this value.
	 */
	active?: boolean;
};

export async function listPromotionsEndpoint(
	stage: Stage,
	catalogHelper: ProductCatalogHelper,
	filters: ListPromotionsFilters = {},
) {
	try {
		const allPromotions = await getPromotions(stage);
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

		return ok({ promotions: succeeded });
	} catch (error) {
		logger.error('Error retrieving promotions', error);
		return buildErrorResponse(error);
	}
}
