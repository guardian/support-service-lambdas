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
import { DoPreviewAction } from './action/preview';
import { DoSwitchAction } from './action/switch';
import { getZuoraCatalogFromS3 } from '@modules/zuora-catalog/S3';
import { SubscriptionFilter } from '../guardianSubscription/subscriptionFilter';
import { GuardianSubscriptionParser } from '../guardianSubscription/guardianSubscriptionParser';
import {
	getSinglePlanFlattenedSubscriptionOrThrow,
	GuardianSubscriptionWithKeys,
} from '../guardianSubscription/getSinglePlanFlattenedSubscriptionOrThrow';
import { SwitchOrderRequestBuilder } from './prepare/buildSwitchOrderRequest';
import { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
import { getSwitchInformation } from './prepare/switchInformation';

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

function getLazySimpleInvoiceItems(
	zuoraClient: ZuoraClient,
	today: dayjs.Dayjs,
	accountNumber: string,
	subscriptionNumber: string,
) {
	return new Lazy(
		() =>
			getBillingPreview(zuoraClient, today.add(13, 'months'), accountNumber),
		'get billing preview for the subscription',
	)
		.then(itemsForSubscription(subscriptionNumber))
		.then(toSimpleInvoiceItems);
}

export function productSwitchEndpoint(stage: Stage, today: dayjs.Dayjs) {
	return async (
		body: ProductSwitchGenericRequestBody,
		zuoraClient: ZuoraClient,
		subscription: ZuoraSubscription,
		account: ZuoraAccount,
	): Promise<APIGatewayProxyResult> => {
		logger.log('Loading the product catalog');
		const productCatalogHelper = new ProductCatalogHelper(
			await getProductCatalogFromApi(stage),
		);
		const guardianSubscriptionParser = new GuardianSubscriptionParser(
			await getZuoraCatalogFromS3(stage), // TODO maybe we can build from product catalog instead?
		);
		const doSwitchAction = new DoSwitchAction(zuoraClient, stage, dayjs());
		const doPreviewAction = new DoPreviewAction(zuoraClient, stage, dayjs());

		// don't get the billing preview until we know the subscription is not cancelled
		const lazyBillingPreview = getLazySimpleInvoiceItems(
			zuoraClient,
			today,
			subscription.accountNumber,
			subscription.subscriptionNumber,
		);

		const activeCurrentSubscriptionFilter =
			SubscriptionFilter.activeCurrentSubscriptionFilter(today);

		const guardianSubscriptionWithKeys: GuardianSubscriptionWithKeys =
			getSinglePlanFlattenedSubscriptionOrThrow(
				activeCurrentSubscriptionFilter.filterSubscription(
					guardianSubscriptionParser.parse(subscription),
				),
			);

		const mode: 'switch' | 'save' = !!body.applyDiscountIfAvailable
			? 'save'
			: 'switch';

		const switchInformation = await getSwitchInformation(
			productCatalogHelper,
			body,
			mode,
			account,
			guardianSubscriptionWithKeys,
			lazyBillingPreview,
		);

		logger.log(`switching from/to`, {
			from: guardianSubscriptionWithKeys.productCatalogKeys,
			to: body.targetProduct,
		});

		const orderRequest: SwitchOrderRequestBuilder =
			new SwitchOrderRequestBuilder(
				switchInformation.target.productRatePlanId,
				switchInformation.target.contributionCharge,
				switchInformation.target.discount?.productRatePlanId[stage],
				switchInformation.subscription,
				body.preview,
			);

		const response = body.preview
			? await doPreviewAction.preview(
					switchInformation.subscription,
					switchInformation.target,
					orderRequest,
				)
			: await doSwitchAction.switchToSupporterPlus(
					body,
					switchInformation,
					orderRequest,
				);

		return {
			body: JSON.stringify(response),
			statusCode: 200,
		};
	};
}
