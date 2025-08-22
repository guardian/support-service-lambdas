import { Logger } from '@modules/logger';
import { Router } from '@modules/routing/router';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
	listenDisputeCreatedHandler,
	listenDisputeClosedHandler,
} from './handlers';

const logger = new Logger();
const router = new Router([
	{
		httpMethod: 'POST',
		path: '/listen-dispute-created',
		handler: listenDisputeCreatedHandler(logger),
	},
	{
		httpMethod: 'POST',
		path: '/listen-dispute-closed',
		handler: listenDisputeClosedHandler(logger),
	},
]);
export const handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	logger.log(`Input is ${JSON.stringify(event)}`);
	const response = await router.routeRequest(event);
	logger.log(`Response is ${JSON.stringify(response)}`);
	return response;
};
