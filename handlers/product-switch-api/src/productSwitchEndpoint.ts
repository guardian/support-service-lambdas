import { ValidationError } from '@modules/errors';
import { checkDefined } from '@modules/nullAndUndefined';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import type { Stage } from '@modules/stage';
import { getAccount } from '@modules/zuora/getAccount';
import { getSubscription } from '@modules/zuora/getSubscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { APIGatewayProxyEventHeaders } from 'aws-lambda';
import { switchToSupporterPlus } from './contributionToSupporterPlus';

// Gets a subscription from Zuora and checks that it is owned by currently logged in user
const getSubscriptionWithOwnerCheck = async (
	zuoraClient: ZuoraClient,
	headers: APIGatewayProxyEventHeaders,
	subscriptionNumber: string,
) => {
	console.log(
		`Checking subscription ${subscriptionNumber} is owned by the currently logged in user`,
	);
	const identityId = checkDefined(
		headers['x-identity-id'],
		'Identity ID not found in request',
	);
	const subscription = await getSubscription(zuoraClient, subscriptionNumber);
	const account = await getAccount(zuoraClient, subscription.accountNumber);
	if (account.basicInfo.identityId !== identityId) {
		throw new ValidationError(
			`Subscription ${subscription.subscriptionNumber} does not belong to identity ID ${identityId}`,
		);
	}
	console.log(
		`Subscription ${subscriptionNumber} is owned by identity user ${identityId}`,
	);
	return subscription;
};
export const contributionToSupporterPlusEndpoint = async (
	stage: Stage,
	headers: APIGatewayProxyEventHeaders,
	body: string,
	subscriptionNumber: string,
) => {
	const zuoraClient = await ZuoraClient.create(stage);
	console.log('Loading the product catalog');
	const productCatalog = await getProductCatalogFromApi(stage);
	console.log('Getting the subscription details from Zuora');
	const subscription = await getSubscriptionWithOwnerCheck(
		zuoraClient,
		headers,
		subscriptionNumber,
	);
	const response = await switchToSupporterPlus(
		zuoraClient,
		productCatalog,
		subscription,
		body,
	);
	return {
		body: JSON.stringify(response),
		statusCode: 200,
	};
};
