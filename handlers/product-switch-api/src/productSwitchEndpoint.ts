import { Lazy } from '@modules/lazy';
import { prettyPrint } from '@modules/prettyPrint';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import type { Stage } from '@modules/stage';
import {
	billingPreviewToSimpleInvoiceItems,
	getBillingPreview,
} from '@modules/zuora/billingPreview';
import { getAccount } from '@modules/zuora/getAccount';
import { getSubscription } from '@modules/zuora/getSubscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { APIGatewayProxyEventHeaders } from 'aws-lambda';
import type dayjs from 'dayjs';
import { preview, switchToSupporterPlus } from './contributionToSupporterPlus';
import { productSwitchRequestSchema } from './schemas';
import { getSwitchInformationWithOwnerCheck } from './switchInformation';

export const contributionToSupporterPlusEndpoint = async (
	stage: Stage,
	headers: APIGatewayProxyEventHeaders,
	body: string,
	subscriptionNumber: string,
	today: dayjs.Dayjs,
) => {
	const identityId = headers['x-identity-id'];
	const zuoraClient = await ZuoraClient.create(stage);
	console.log('Loading the product catalog');
	const productCatalog = await getProductCatalogFromApi(stage);
	const input = productSwitchRequestSchema.parse(JSON.parse(body));
	console.log(`Request body is ${prettyPrint(input)}`);
	console.log('Getting the subscription and account details from Zuora');

	const subscription = await getSubscription(zuoraClient, subscriptionNumber);

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
	).then(billingPreviewToSimpleInvoiceItems);

	const switchInformation = await getSwitchInformationWithOwnerCheck(
		stage,
		input,
		subscription,
		account,
		productCatalog,
		identityId,
		lazyBillingPreview,
		today,
	);

	const response = input.preview
		? await preview(zuoraClient, switchInformation, subscription)
		: await switchToSupporterPlus(zuoraClient, switchInformation);

	return {
		body: JSON.stringify(response),
		statusCode: 200,
	};
};
