import { checkDefined } from '@modules/nullAndUndefined';
import { prettyPrint } from '@modules/prettyPrint';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import type { Stage } from '@modules/stage';
import { getAccount } from '@modules/zuora/getAccount';
import { getSubscription } from '@modules/zuora/getSubscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { APIGatewayProxyEventHeaders } from 'aws-lambda';
import { productSwitchRequestSchema } from '../schemas';
import { preview, switchToSupporterPlus } from './contributionToSupporterPlus';
import { getSwitchInformationWithOwnerCheck } from './switchInformation';

export const contributionToSupporterPlusEndpoint = async (
	stage: Stage,
	headers: APIGatewayProxyEventHeaders,
	body: string,
	subscriptionNumber: string,
) => {
	const identityId = checkDefined(
		headers['x-identity-id'],
		'Identity ID not found in request',
	);
	const zuoraClient = await ZuoraClient.create(stage);
	console.log('Loading the product catalog');
	const productCatalog = await getProductCatalogFromApi(stage);
	const input = productSwitchRequestSchema.parse(JSON.parse(body));
	console.log(`Request body is ${prettyPrint(input)}`);
	console.log('Getting the subscription and account details from Zuora');
	const subscription = await getSubscription(zuoraClient, subscriptionNumber);
	const account = await getAccount(zuoraClient, subscription.accountNumber);

	const switchInformation = getSwitchInformationWithOwnerCheck(
		stage,
		input,
		subscription,
		account,
		productCatalog,
		identityId,
	);
	const response = input.preview
		? await preview(zuoraClient, switchInformation)
		: await switchToSupporterPlus(zuoraClient, switchInformation);

	return {
		body: JSON.stringify(response),
		statusCode: 200,
	};
};
