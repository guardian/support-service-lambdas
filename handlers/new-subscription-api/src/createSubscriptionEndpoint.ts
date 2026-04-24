import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import { getPromotion } from '@modules/promotions/v2/getPromotion';
import type { AppliedPromotion } from '@modules/promotions/v2/schema';
import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';
import { createSubscriptionWithExistingPaymentMethod } from '@modules/zuora/createSubscription/createSubscriptionWithExistingPaymentMethod';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { APIGatewayProxyResult } from 'aws-lambda';
import type { CreateSubscriptionRequest } from './requestSchema';
import type { CreateSubscriptionResponse } from './responseSchema';

async function fetchPromotionFromAppliedPromotion(
	stage: Stage,
	appliedPromotion: AppliedPromotion | undefined,
) {
	if (appliedPromotion) {
		logger.log(
			`Fetching promotion from appliedPromotion ${appliedPromotion.promoCode}`,
		);
		const promotion = await getPromotion(appliedPromotion.promoCode, stage);
		logger.log('Promotion fetched successfully');
		return promotion;
	}
	return;
}

export async function createNewSubscriptionEndpoint(
	stage: Stage,
	zuoraClient: ZuoraClient,
	productCatalog: ProductCatalog,
	requestBody: CreateSubscriptionRequest,
): Promise<APIGatewayProxyResult> {
	logger.log('Starting createNewSubscriptionEndpoint');
	const promotion = await fetchPromotionFromAppliedPromotion(
		stage,
		requestBody.appliedPromotion,
	);

	logger.log('Building and executing create subscription request');
	const result: CreateSubscriptionResponse =
		await createSubscriptionWithExistingPaymentMethod(
			zuoraClient,
			productCatalog,
			requestBody,
			promotion,
		);

	logger.log('Subscription created successfully', result);
	return {
		statusCode: 200,
		body: JSON.stringify(result),
	};
}
