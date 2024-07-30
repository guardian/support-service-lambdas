import { sendEmail } from '@modules/email/email';
import { ValidationError } from '@modules/errors';
import { getIfDefined } from '@modules/nullAndUndefined';
import type { Stage } from '@modules/stage';
import type { FetchInterface } from '@modules/zuora/requestLogger';
import { RequestLogger } from '@modules/zuora/requestLogger';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
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

const stage = process.env.STAGE as Stage | undefined;
export const handler: (
	event: APIGatewayProxyEvent,
) => Promise<APIGatewayProxyResult> = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	console.log(`Input is ${JSON.stringify(event)}`);
	const requestLogger = new RequestLogger(stage ?? 'DEV');
	requestLogger.setRequest(JSON.stringify(event));
	const response = await routeRequest(event, requestLogger);
	console.log(`Response is ${JSON.stringify(response)}`);
	await requestLogger.setResponse(response);
	return response;
};

// this is a type safe version of stringify
const stringify = <T>(t: T): string => JSON.stringify(t);

export const routeRequest = async (
	event: APIGatewayProxyEvent,
	fetchInterface: FetchInterface,
): Promise<APIGatewayProxyResult> => {
	try {
		switch (true) {
			case event.path === '/apply-discount' && event.httpMethod === 'POST': {
				console.log('Applying a discount');
				const subscriptionNumber = applyDiscountSchema.parse(
					JSON.parse(getIfDefined(event.body, 'No body was provided')),
				).subscriptionNumber;
				const { response, emailPayload } = await applyDiscountEndpoint(
					stage ?? 'CODE',
					event.headers,
					subscriptionNumber,
					dayjs(),
					fetchInterface,
				);
				if (emailPayload) {
					await sendEmail(stage ?? 'CODE', emailPayload);
				}
				return {
					body: stringify<ApplyDiscountResponseBody>(response),
					statusCode: 200,
				};
			}
			case event.path === '/preview-discount' && event.httpMethod === 'POST': {
				console.log('Previewing discount');
				const subscriptionNumber = applyDiscountSchema.parse(
					JSON.parse(getIfDefined(event.body, 'No body was provided')),
				).subscriptionNumber;
				const result = await previewDiscountEndpoint(
					stage ?? 'CODE',
					event.headers,
					subscriptionNumber,
					dayjs(),
					fetchInterface,
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
		console.log('Caught error in index.ts ', error);
		if (error instanceof ValidationError) {
			console.log(`Validation failure: ${error.message}`);
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
