import { ValidationError } from '@modules/errors';
import { supportRegionIdFromCountry } from '@modules/internationalisation/countryGroup';
import { isoCountrySchema } from '@modules/internationalisation/schemas';
import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import { getPromotion } from '@modules/promotions/v2/getPromotion';
import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';
import { getDeliveryFields } from '@modules/zuora/createSubscription/createSubscription';
import { createSubscriptionWithExistingPaymentMethod } from '@modules/zuora/createSubscription/createSubscriptionWithExistingPaymentMethod';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { APIGatewayProxyResult } from 'aws-lambda';
import type { CreateSubscriptionRequest } from './requestSchema';
import type { CreateSubscriptionResponse } from './responseSchema';

async function fetchPromotionAndAppliedPromotionFromPromoCode(
	stage: Stage,
	requestBody: CreateSubscriptionRequest,
) {
	const promoCode = requestBody.promoCode;
	if (promoCode === undefined) {
		return undefined;
	}

	logger.log(`Fetching promotion from appliedPromotion ${promoCode}`);
	const promotion = await getPromotion(promoCode, stage);
	logger.log('Promotion fetched successfully');
	const deliveryDetails = getDeliveryFields(requestBody.productPurchase);
	const supportRegionCountry = isoCountrySchema.parse(
		deliveryDetails.deliveryContact?.country ??
			requestBody.billToContact.country,
	);
	const supportRegionId = supportRegionIdFromCountry(supportRegionCountry);
	if (!supportRegionId) {
		throw new ValidationError(
			`No support region found for country ${supportRegionCountry}`,
		);
	}

	return {
		appliedPromotion: {
			promoCode,
			supportRegionId,
		},
		promotion,
	};
}

export async function createNewSubscriptionEndpoint(
	stage: Stage,
	zuoraClient: ZuoraClient,
	productCatalog: ProductCatalog,
	requestBody: CreateSubscriptionRequest,
): Promise<APIGatewayProxyResult> {
	logger.log('Starting createNewSubscriptionEndpoint');
	const { appliedPromotion, promotion } =
		(await fetchPromotionAndAppliedPromotionFromPromoCode(
			stage,
			requestBody,
		)) ?? {};

	const bodyWithAppliedPromotion = { ...requestBody, appliedPromotion };

	logger.log('Building and executing create subscription request');
	const result: CreateSubscriptionResponse =
		await createSubscriptionWithExistingPaymentMethod(
			zuoraClient,
			productCatalog,
			bodyWithAppliedPromotion,
			promotion,
		);

	logger.log('Subscription created successfully', result);
	return {
		statusCode: 200,
		body: JSON.stringify(result),
	};
}
