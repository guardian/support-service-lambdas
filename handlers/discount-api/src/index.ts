import { ValidationError } from '@modules/errors';
import type { Stage } from '@modules/stage';
import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
import { discountEndpoint } from './discountEndpoint';

const stage = process.env.STAGE as Stage;
export const handler: Handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	console.log(`Input is ${JSON.stringify(event)}`);
	const response = await routeRequest(event);
	console.log(`Response is ${JSON.stringify(response)}`);
	return response;
};

const routeRequest = async (event: APIGatewayProxyEvent) => {
	try {
		switch (true) {
			case event.path === '/apply-discount' && event.httpMethod === 'POST': {
				console.log('Applying a discount');
				const result = await discountEndpoint(
					stage,
					false,
					event.headers,
					event.body,
				);
				return {
					body: JSON.stringify(result),
					statusCode: 200,
				};
			}
			case event.path === '/preview-discount' && event.httpMethod === 'POST': {
				console.log('Previewing discount');
				const result = await discountEndpoint(
					stage,
					true,
					event.headers,
					event.body,
				);
				return {
					body: JSON.stringify(result),
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
				body: JSON.stringify(error),
				statusCode: 500,
			};
		}
	}
};
