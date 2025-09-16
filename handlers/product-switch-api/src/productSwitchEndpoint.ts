import { Lazy } from '@modules/lazy';
import { prettyPrint } from '@modules/prettyPrint';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';
import { getAccount } from '@modules/zuora/account';
import {
	getBillingPreview,
	itemsForSubscription,
	toSimpleInvoiceItems,
} from '@modules/zuora/billingPreview';
import { getSubscription } from '@modules/zuora/subscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import type dayjs from 'dayjs';
import { preview, switchToSupporterPlus } from './contributionToSupporterPlus';
import type { ProductSwitchRequestBody } from './schemas';
import { getSwitchInformationWithOwnerCheck } from './switchInformation';

export const contributionToSupporterPlusEndpoint =
	(stage: Stage, today: dayjs.Dayjs) =>
	async (
		event: APIGatewayProxyEvent,
		parsed: {
			path: { subscriptionNumber: string };
			body: ProductSwitchRequestBody;
		},
	) => {
		logger.mutableAddContext(parsed.path.subscriptionNumber);
		const identityId = event.headers['x-identity-id'];
		const zuoraClient = await ZuoraClient.create(stage);
		logger.log('Loading the product catalog');
		const productCatalog = await getProductCatalogFromApi(stage);
		logger.log(`Request body is ${prettyPrint(parsed.body)}`);
		logger.log('Getting the subscription and account details from Zuora');

		const subscription = await getSubscription(
			zuoraClient,
			parsed.path.subscriptionNumber,
		);

		const account = await getAccount(zuoraClient, subscription.accountNumber);

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

		const switchInformation = await getSwitchInformationWithOwnerCheck(
			stage,
			parsed.body,
			subscription,
			account,
			productCatalog,
			identityId,
			lazyBillingPreview,
			today,
		);

		const response = parsed.body.preview
			? await preview(zuoraClient, switchInformation, subscription)
			: await switchToSupporterPlus(zuoraClient, switchInformation);

		return {
			body: JSON.stringify(response),
			statusCode: 200,
		};
	};
