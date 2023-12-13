import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
import { stageFromEnvironment } from '../../../modules/stage';
import { applyDiscountEndpoint } from './endpoints/applyDiscountEndpoint';
import { previewDiscountEndpoint } from './endpoints/previewDiscountEndpoint';
import { ValidationError } from './errors';

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
		const stage = stageFromEnvironment();
		switch (true) {
			case event.path === '/apply-discount' && event.httpMethod === 'POST': {
				console.log('Applying a discount');
				return await applyDiscountEndpoint(stage, event.body);
			}
			case event.path === '/preview-discount' && event.httpMethod === 'POST': {
				console.log('Previewing discount');
				return await previewDiscountEndpoint(stage, event.body);
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
