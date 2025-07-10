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

function isAPIGatewayEvent(event: any): event is APIGatewayProxyEvent {
	return (
		event &&
		typeof event.httpMethod === 'string' &&
		typeof event.path === 'string'
	);
}

function isBatonRerEvent(event: any): event is BatonRerEventRequest {
	return event && event.requestType && event.requestType === 'RER';
}

async function handleHttpRequest(
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
	try {
		return httpRouter.routeRequest(event);
	} catch (error) {
		console.error('HTTP handler error:', error);
		return {
			statusCode: 500,
			body: JSON.stringify({ error: 'Internal server error' }),
		};
	}
}

async function handleBatonRerEvent(
	event: BatonRerEventRequest,
): Promise<BatonRerEventResponse> {
	try {
		return batonRerRouter.routeRequest(event);
	} catch (error) {
		console.error('Baton RER handler error:', error);
		throw error; // Re-throw to trigger Lambda retry mechanism
	}
}

export const handler: Handler = async (
	event: APIGatewayProxyEvent | BatonRerEventRequest | any,
): Promise<APIGatewayProxyResult | BatonRerEventResponse> => {
	if (isAPIGatewayEvent(event)) {
		console.debug('Processing as API Gateway event');
		return handleHttpRequest(event);
	} else if (isBatonRerEvent(event)) {
		console.debug('Processing as Baton RER event');
		return handleBatonRerEvent(event);
	} else {
		throw new Error(`Unsupported event type: ${typeof event}`);
	}
};
