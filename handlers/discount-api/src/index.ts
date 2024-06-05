import { ValidationError } from '@modules/errors';
import type { Stage } from '@modules/stage';
import type { FetchInterface } from '@modules/zuora/requestLogger';
import { RequestLogger } from '@modules/zuora/requestLogger';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { discountEndpoint } from './discountEndpoint';

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

export const routeRequest = async (
	event: APIGatewayProxyEvent,
	fetchInterface: FetchInterface,
): Promise<APIGatewayProxyResult> => {
	try {
		switch (true) {
			case event.path === '/apply-discount' && event.httpMethod === 'POST': {
				console.log('Applying a discount');
				return await discountEndpoint(
					stage ?? 'CODE',
					false,
					event.headers,
					event.body,
					fetchInterface,
				);
			}
			case event.path === '/preview-discount' && event.httpMethod === 'POST': {
				console.log('Previewing discount');
				return await discountEndpoint(
					stage ?? 'CODE',
					true,
					event.headers,
					event.body,
					fetchInterface,
				);
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
				body: JSON.stringify(error),
				statusCode: 500,
			};
		}
	}
};
