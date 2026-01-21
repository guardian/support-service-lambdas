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
import type {
	ProductSwitchGenericRequestBody,
	ProductSwitchRequestBody,
} from '../schemas';
import getSwitchInformation from './switchInformation';
import { preview } from './preview';
import { switchToSupporterPlus } from './switch';
import { getZuoraCatalogFromS3 } from '@modules/zuora-catalog/S3';
import { SubscriptionFilter } from './subscriptionFilter';
import { GuardianSubscriptionParser } from './guardianSubscriptionParser';
import {
	getSinglePlanSubscriptionOrThrow,
	GuardianSubscriptionWithKeys,
} from './getSinglePlanSubscriptionOrThrow';

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
		const zuoraCatalog = await getZuoraCatalogFromS3(stage);

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

		const guardianSubscriptionParser = new GuardianSubscriptionParser(
			zuoraCatalog,
		);
		const subscriptionFilter =
			SubscriptionFilter.activeCurrentSubscriptionFilter(today);

		const guardianSubscriptionWithKeys: GuardianSubscriptionWithKeys =
			getSinglePlanSubscriptionOrThrow(
				subscriptionFilter.filterSubscription(
					guardianSubscriptionParser.parse(subscription),
				),
			);

		const switchInformation = await getSwitchInformation(
			stage,
			body,
			guardianSubscriptionWithKeys,
			account,
			productCatalog,
			lazyBillingPreview,
			today,
		);

		const response = body.preview
			? await preview(zuoraClient, switchInformation, subscription)
			: await switchToSupporterPlus(
					zuoraClient,
					stage,
					body,
					switchInformation,
					dayjs(),
				);

		return {
			body: JSON.stringify(response),
			statusCode: 200,
		};
	};
}
