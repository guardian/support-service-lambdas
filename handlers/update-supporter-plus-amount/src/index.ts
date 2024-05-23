import { checkDefined } from '@modules/nullAndUndefined';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import type { Stage } from '@modules/stage';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
import { requestBodySchema } from './schema';
import { updateSupporterPlusAmount } from './updateSupporterPlusAmount';
import { getSubscriptionNumberFromUrl } from './urlParsing';

const stage = process.env.STAGE as Stage;

export const handler: Handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	console.log(`Input is ${JSON.stringify(event)}`);
	const subscriptionNumber = getSubscriptionNumberFromUrl(event.path);
	const eventBody = checkDefined(event.body, 'No request body provided');
	const requestBody = requestBodySchema.parse(JSON.parse(eventBody));
	const zuoraClient = await ZuoraClient.create(stage);
	const productCatalog = await getProductCatalogFromApi(stage);
	return await updateSupporterPlusAmount(
		zuoraClient,
		productCatalog,
		subscriptionNumber,
		requestBody.newPaymentAmount,
	);
};
