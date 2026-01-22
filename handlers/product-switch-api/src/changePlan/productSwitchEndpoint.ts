import { Lazy } from '@modules/lazy';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';
import {
	getBillingPreview,
	itemsForSubscription,
	toSimpleInvoiceItems,
} from '@modules/zuora/billingPreview';
import { ZuoraAccount, ZuoraSubscription } from '@modules/zuora/types/objects';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { APIGatewayProxyResult } from 'aws-lambda';
import dayjs from 'dayjs';
import type {
	ProductSwitchGenericRequestBody,
	ProductSwitchRequestBody,
} from '../schemas';
import getTargetInformation from './targetInformation';
import { preview } from './preview';
import { switchToSupporterPlus } from './switch';
import { getZuoraCatalogFromS3 } from '@modules/zuora-catalog/S3';
import { SubscriptionFilter } from './subscriptionFilter';
import { GuardianSubscriptionParser } from './guardianSubscriptionParser';
import {
	getSinglePlanFlattenedSubscriptionOrThrow,
	GuardianSubscriptionWithKeys,
} from './getSinglePlanFlattenedSubscriptionOrThrow';
import { getAccountInformation } from './accountInformation';
import {
	getSubscriptionInformation,
	SubscriptionInformation,
} from './subscriptionInformation';
import { buildSwitchRequestWithoutOptions } from './buildSwitchOrderRequest';
import { OrderRequest } from '@modules/zuora/orders/orderRequests';
import { isGenerallyEligibleForDiscount } from './isGenerallyEligibleForDiscount';

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
		const guardianSubscriptionParser = new GuardianSubscriptionParser(
			await getZuoraCatalogFromS3(stage), // TODO maybe we can build from product catalog?
		);

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

		const activeCurrentSubscriptionFilter =
			SubscriptionFilter.activeCurrentSubscriptionFilter(today);

		const guardianSubscriptionWithKeys: GuardianSubscriptionWithKeys =
			getSinglePlanFlattenedSubscriptionOrThrow(
				activeCurrentSubscriptionFilter.filterSubscription(
					guardianSubscriptionParser.parse(subscription),
				),
			);

		const accountInformation = getAccountInformation(account);

		const subscriptionInformation: SubscriptionInformation =
			getSubscriptionInformation(guardianSubscriptionWithKeys);

		const mode: 'switch' | 'save' = !!body.applyDiscountIfAvailable
			? 'save'
			: 'switch';

		const generallyEligibleForDiscount = isGenerallyEligibleForDiscount(
			guardianSubscriptionWithKeys.subscription.status,
			mode,
			account.metrics.totalInvoiceBalance,
			lazyBillingPreview,
		);

		const targetInformation = await getTargetInformation(
			mode,
			body,
			guardianSubscriptionWithKeys.productCatalogKeys,
			generallyEligibleForDiscount,
			accountInformation.currency,
			subscriptionInformation.previousAmount,
			productCatalog,
		);
		const orderRequest: OrderRequest = buildSwitchRequestWithoutOptions(
			targetInformation.productRatePlanId,
			targetInformation.contributionCharge,
			targetInformation.discount?.productRatePlanId[stage],
			subscriptionInformation,
			dayjs(),
			body.preview,
		);
		const response = body.preview
			? await preview(
					zuoraClient,
					stage,
					subscriptionInformation,
					targetInformation,
					orderRequest,
				)
			: await switchToSupporterPlus(
					zuoraClient,
					stage,
					body,
					accountInformation,
					targetInformation,
					subscriptionInformation,
					dayjs(),
					orderRequest,
				);

		return {
			body: JSON.stringify(response),
			statusCode: 200,
		};
	};
}
