import { sendEmail } from '@modules/email/email';
import { ValidationError } from '@modules/errors';
import { getIfDefined } from '@modules/nullAndUndefined';
import type { Stage } from '@modules/stage';
import { Logger } from '@modules/zuora/logger';
import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
import dayjs from 'dayjs';
import {
	applyDiscountEndpoint,
	previewDiscountEndpoint,
} from './discountEndpoint';
import { applyDiscountSchema } from './requestSchema';
import type {
	ApplyDiscountResponseBody,
	EligibilityCheckResponseBody,
} from './responseSchema';

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

// this is a type safe version of stringify
const stringify = <T>(t: T): string => JSON.stringify(t);

const routeRequest = async (logger: Logger, event: APIGatewayProxyEvent) => {
	try {
		switch (true) {
			case event.path === '/apply-discount' && event.httpMethod === 'POST': {
				logger.log('Applying a discount');
				const subscriptionNumber = applyDiscountSchema.parse(
					JSON.parse(getIfDefined(event.body, 'No body was provided')),
				).subscriptionNumber;
				logger.mutableAddContext(subscriptionNumber);
				const { response, emailPayload } = await applyDiscountEndpoint(
					logger,
					stage,
					event.headers,
					subscriptionNumber,
					dayjs(),
				);
				await sendEmail(stage, emailPayload, logger.log.bind(logger));
				return {
					body: stringify<ApplyDiscountResponseBody>(response),
					statusCode: 200,
				};
			}
			case event.path === '/preview-discount' && event.httpMethod === 'POST': {
				logger.log('Previewing discount');
				const subscriptionNumber = applyDiscountSchema.parse(
					JSON.parse(getIfDefined(event.body, 'No body was provided')),
				).subscriptionNumber;
				logger.mutableAddContext(subscriptionNumber);
				const result = await previewDiscountEndpoint(
					logger,
					stage,
					event.headers,
					subscriptionNumber,
					dayjs(),
				);
				return {
					body: stringify<EligibilityCheckResponseBody>(result),
					statusCode: 200,
				};
			}
			default:
				return {
					body: 'Not found',
					statusCode: 404,
				};
		}
	} catch (error) {
		logger.error('Caught error in index.ts ', error);
		if (error instanceof ValidationError) {
			logger.error(`Validation failure: ${error.message}`);
			return {
				body: error.message,
				statusCode: 400,
			};
		} else {
			return {
				body: 'Internal server error, check the logs for more information',
				statusCode: 500,
			};
		}
	}
};
