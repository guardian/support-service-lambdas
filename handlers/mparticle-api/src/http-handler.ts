import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
import { httpRouter } from './routers/http';

export const handler: Handler<APIGatewayProxyEvent, APIGatewayProxyResult> = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	try {
		console.debug('Processing HTTP request');
		return httpRouter.routeRequest(event);
	} catch (error) {
		console.error('HTTP handler error:', error);
		return {
			statusCode: 500,
			body: JSON.stringify({ error: 'Internal server error' }),
		};
	}
};
