import { checkDefined } from '@modules/nullAndUndefined';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import type { Stage } from '@modules/stage';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { APIGatewayProxyEventHeaders } from 'aws-lambda';
import { switchToSupporterPlus } from './contributionToSupporterPlus';
import { productSwitchRequestSchema } from './schemas';
import { getSwitchInformationWithOwnerCheck } from './userInformation';

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
	console.log('Getting the subscription details from Zuora');

	const switchInformation = await getSwitchInformationWithOwnerCheck(
		stage,
		input.preview,
		zuoraClient,
		productCatalog,
		identityId,
		subscriptionNumber,
		input.price,
	);
	const response = await switchToSupporterPlus(zuoraClient, switchInformation);
	return {
		body: JSON.stringify(response),
		statusCode: 200,
	};
};
