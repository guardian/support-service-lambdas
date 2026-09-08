import { logger } from '@modules/logger/logger';
import type { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
import { addCatalogInformationToPromos } from '@modules/promotions/v2/addCatalogInformationToPromo';
import { getPromotions } from '@modules/promotions/v2/getPromotions';
import { buildErrorResponse, ok } from '@modules/routing/apiGatewayResponses';
import type { Stage } from '@modules/stage';

export async function listPromotionsEndpoint(
	stage: Stage,
	catalogHelper: ProductCatalogHelper,
) {
	try {
		const promotions = await getPromotions(stage);
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
