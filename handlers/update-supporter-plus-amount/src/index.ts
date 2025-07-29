import { sendEmail } from '@modules/email/email';
import { ValidationError } from '@modules/errors';
import { Logger } from '@modules/logger';
import { getIfDefined } from '@modules/nullAndUndefined';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import type { Stage } from '@modules/stage';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
import { requestBodySchema } from './schema';
import { createThankYouEmail } from './sendEmail';
import { updateSupporterPlusAmount } from './updateSupporterPlusAmount';
import { getSubscriptionNumberFromUrl } from './urlParsing';

const stage = process.env.STAGE as Stage;

export const handler: Handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	const logger = new Logger();
	logger.log(`Input is ${JSON.stringify(event)}`);
	const response = await routeRequest(logger, event);
	logger.log(`Response is ${JSON.stringify(response)}`);
	return response;
};

const routeRequest = async (logger: Logger, event: APIGatewayProxyEvent) => {
	try {
		const subscriptionNumber = getSubscriptionNumberFromUrl(event.path);
		logger.mutableAddContext(subscriptionNumber);
		const eventBody = getIfDefined(event.body, 'No request body provided');
		const requestBody = requestBodySchema.parse(JSON.parse(eventBody));
		const identityId = getIfDefined(
			event.headers['x-identity-id'],
			'Identity ID not found in request',
		);
		const zuoraClient = await ZuoraClient.create(stage, logger);
		const productCatalog = await getProductCatalogFromApi(
			stage,
			logger.log.bind(logger),
		);
		const emailFields = await updateSupporterPlusAmount(
			logger,
			zuoraClient,
			productCatalog,
			identityId,
			subscriptionNumber,
			requestBody.newPaymentAmount,
		);
		await sendEmail(
			stage,
			createThankYouEmail(emailFields),
			logger.log.bind(logger),
		);
		return {
			body: JSON.stringify({ message: 'Success' }),
			statusCode: 200,
		};
	} catch (error) {
		logger.log('Caught error in index.ts ', error);
		if (error instanceof ValidationError) {
			logger.log(`Validation failure: ${error.message}`);
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
