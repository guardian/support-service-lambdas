import { logger } from '@modules/logger/logger';
import { getPromotions } from '@modules/promotions/v2/getPromotions';
import { buildErrorResponse, ok } from '@modules/routing/apiGatewayResponses';
import type { Stage } from '@modules/stage';

export async function listPromotionsEndpoint(stage: Stage) {
	try {
		const promotions = await getPromotions(stage);
		return ok({ promotions });
	} catch (error) {
		logger.error('Error retrieving promotions', error);
		return buildErrorResponse(error);
	}
}
