import { Lazy } from '@modules/lazy';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';
import {
	getBillingPreview,
	itemsForSubscription,
	toSimpleInvoiceItems,
} from '@modules/zuora/billingPreview';
import type {
	ZuoraAccount,
	ZuoraSubscription,
} from '@modules/zuora/types/objects';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { APIGatewayProxyResult } from 'aws-lambda';
import dayjs from 'dayjs';
import { preview, switchToSupporterPlus } from './contributionToSupporterPlus';
import type {
	ProductSwitchGenericRequestBody,
	ProductSwitchRequestBody,
} from './schemas';
import { getSwitchInformation } from './switchInformation';

export function contributionToSupporterPlusEndpoint(
	stage: Stage,
	today: dayjs.Dayjs,
) {
	return async (
		body: ProductSwitchRequestBody,
		zuoraClient: ZuoraClient,
		subscription: ZuoraSubscription,
		account: ZuoraAccount,
	): Promise<APIGatewayProxyResult> =>
		await productSwitchEndpoint(stage, today)(
			{ ...body, targetProduct: 'SupporterPlus' },
			zuoraClient,
			subscription,
			account,
		);
}

export function productSwitchEndpoint(stage: Stage, today: dayjs.Dayjs) {
	return async (
		body: ProductSwitchGenericRequestBody,
		zuoraClient: ZuoraClient,
		subscription: ZuoraSubscription,
		account: ZuoraAccount,
	): Promise<APIGatewayProxyResult> => {
		logger.log('Loading the product catalog');
		const productCatalog = await getProductCatalogFromApi(stage);

		// don't get the billing preview until we know the subscription is not cancelled
		const lazyBillingPreview = new Lazy(
			() =>
				getBillingPreview(
					zuoraClient,
					today.add(13, 'months'),
					subscription.accountNumber,
				),
			'get billing preview for the subscription',
		)
			.then(itemsForSubscription(subscription.subscriptionNumber))
			.then(toSimpleInvoiceItems);

		const switchInformation = await getSwitchInformation(
			stage,
			body,
			subscription,
			account,
			productCatalog,
			lazyBillingPreview,
			today,
		);

		const response = body.preview
			? await preview(zuoraClient, switchInformation, subscription)
			: await switchToSupporterPlus(zuoraClient, switchInformation, dayjs());

		return {
			body: JSON.stringify(response),
			statusCode: 200,
		};
	};
}
