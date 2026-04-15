import { SupportRegionId } from '@modules/internationalisation/countryGroup';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import type { ProductPurchase } from '@modules/product-catalog/productPurchaseSchema';
import { productPurchaseSchema } from '@modules/product-catalog/productPurchaseSchema';
import { getPromotion } from '@modules/promotions/v2/getPromotion';
import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';
import {
	createSubscription,
	type CreateSubscriptionInputFields,
} from '@modules/zuora/createSubscription/createSubscription';
import type { PaymentMethod } from '@modules/zuora/orders/paymentMethods';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { APIGatewayProxyResult } from 'aws-lambda';
import type { CreateSubscriptionRequest } from './requestSchema';
import type { CreateSubscriptionResponse } from './responseSchema';

function parseProductPurchase(
	productPurchase: CreateSubscriptionRequest['productPurchase'],
): ProductPurchase {
	logger.log('Parsing product purchase', {
		product: productPurchase.product,
		ratePlan: productPurchase.ratePlan,
	});
	const parseResult = productPurchaseSchema.safeParse(productPurchase);
	if (!parseResult.success) {
		logger.log('Product purchase validation failed', {
			errors: parseResult.error.errors,
		});
		throw new Error(
			`Invalid product purchase: ${JSON.stringify(parseResult.error.errors)}`,
		);
	}
	return parseResult.data;
}

export async function createNewSubscriptionEndpoint(
	stage: Stage,
	zuoraClient: ZuoraClient,
	requestBody: CreateSubscriptionRequest,
): Promise<APIGatewayProxyResult> {
	logger.log('Starting createNewSubscriptionEndpoint', {
		createdRequestId: requestBody.createdRequestId,
		product: requestBody.productPurchase.product,
		ratePlan: requestBody.productPurchase.ratePlan,
		currency: requestBody.currency,
		identityId: requestBody.identityId,
	});

	logger.log('Fetching product catalog');
	const productCatalog = await getProductCatalogFromApi(stage);
	logger.log('Product catalog fetched successfully');

	const productPurchase = parseProductPurchase(requestBody.productPurchase);
	logger.log('Product purchase validated successfully', {
		product: productPurchase.product,
	});

	let promotion = undefined;
	if (requestBody.promoCode) {
		logger.log('Fetching promotion', { promoCode: requestBody.promoCode });
		try {
			promotion = await getPromotion(requestBody.promoCode, stage);
			logger.log('Promotion fetched successfully', {
				promoCode: promotion.promoCode,
				name: promotion.name,
			});
		} catch (error) {
			logger.log('Failed to fetch promotion, proceeding without promotion', {
				promoCode: requestBody.promoCode,
				error: String(error),
			});
		}
	}

	const appliedPromotion =
		requestBody.promoCode !== undefined && promotion !== undefined
			? {
					promoCode: requestBody.promoCode,
					supportRegionId: SupportRegionId.UK,
				}
			: undefined;

	logger.log('Building and executing create subscription request', {
		accountName: requestBody.accountName,
		createdRequestId: requestBody.createdRequestId,
		salesforceAccountId: requestBody.salesforceAccountId,
		product: productPurchase.product,
	});

	// The createSubscription function is generic in the PaymentMethod type.
	// PaymentGateway<PaymentMethod> resolves to the full union of all valid gateway strings,
	// which matches what our request schema validates - so the cast here is safe.
	const inputFields: CreateSubscriptionInputFields<PaymentMethod> = {
		accountName: requestBody.accountName,
		createdRequestId: requestBody.createdRequestId,
		salesforceAccountId: requestBody.salesforceAccountId,
		salesforceContactId: requestBody.salesforceContactId,
		identityId: requestBody.identityId,
		currency: requestBody.currency,
		paymentGateway: requestBody.paymentGateway,
		paymentMethod: requestBody.paymentMethod,
		billToContact: requestBody.billToContact,
		productPurchase: productPurchase,
		appliedPromotion: appliedPromotion,
	};

	const result: CreateSubscriptionResponse = await createSubscription(
		zuoraClient,
		productCatalog,
		inputFields,
		promotion,
	);

	logger.log('Subscription created successfully', {
		orderNumber: result.orderNumber,
		accountNumber: result.accountNumber,
		subscriptionNumbers: result.subscriptionNumbers,
		invoiceNumbers: result.invoiceNumbers,
		paymentNumber: result.paymentNumber,
		paidAmount: result.paidAmount,
	});

	return {
		statusCode: 200,
		body: JSON.stringify(result),
	};
}
