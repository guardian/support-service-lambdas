import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
import { httpRouter } from './routers/http';
import {
	BatonRerEventRequest,
	BatonRerEventResponse,
	batonRerRouter,
} from './routers/baton';

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
	BatonRerEventRequest,
	BatonRerEventResponse
> = async (event: BatonRerEventRequest): Promise<BatonRerEventResponse> => {
	try {
		console.debug('Processing Baton RER event');
		return batonRerRouter.routeRequest(event);
	} catch (error) {
		console.error('Baton RER handler error:', error);
		throw error; // Re-throw to trigger Lambda retry mechanism
	}
};
