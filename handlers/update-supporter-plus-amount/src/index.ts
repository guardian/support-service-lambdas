import { ValidationError } from '@modules/errors';
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
import { sendThankYouEmail } from './sendEmail';
import { updateSupporterPlusAmount } from './updateSupporterPlusAmount';
import { getSubscriptionNumberFromUrl } from './urlParsing';

const stage = process.env.STAGE as Stage;

export const handler: Handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	try {
		console.log(`Input is ${JSON.stringify(event)}`);
		const subscriptionNumber = getSubscriptionNumberFromUrl(event.path);
		const eventBody = checkDefined(event.body, 'No request body provided');
		const requestBody = requestBodySchema.parse(JSON.parse(eventBody));
		const identityId = checkDefined(
			event.headers['x-identity-id'],
			'Identity ID not found in request',
		);
		const zuoraClient = await ZuoraClient.create(stage);
		const productCatalog = await getProductCatalogFromApi(stage);
		const emailFields = await updateSupporterPlusAmount(
			zuoraClient,
			productCatalog,
			identityId,
			subscriptionNumber,
			requestBody.newPaymentAmount,
		);
		await sendThankYouEmail({
			stage,
			...emailFields,
		});
		return {
			body: JSON.stringify({ message: 'Success' }),
			statusCode: 200,
		};
	} catch (error) {
		console.log('Caught error in index.ts ', error);
		if (error instanceof ValidationError) {
			console.log(`Validation failure: ${error.message}`);
			return {
				body: error.message,
				statusCode: 400,
			};
		} else {
			return {
				body: 'Unexpected error while carrying out the request',
				statusCode: 500,
			};
		}
	}
};
