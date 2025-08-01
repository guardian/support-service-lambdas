import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
import { httpRouter } from './routers/http';
import {
	BatonEventRequest,
	BatonEventResponse,
} from './routers/baton/types-and-schemas';
import { batonRerRouter } from './routers/baton';

export const handlerHttp: Handler<
	APIGatewayProxyEvent,
	APIGatewayProxyResult
> = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
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

export const handlerBaton: Handler<
	BatonEventRequest,
	BatonEventResponse
> = async (event: BatonEventRequest): Promise<BatonEventResponse> => {
	try {
		console.debug('Processing Baton event');
		return batonRerRouter.routeRequest(event);
	} catch (error) {
		console.error('Baton handler error:', error);
		throw error; // Re-throw to trigger Lambda retry mechanism
	}
};
