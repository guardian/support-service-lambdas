import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Router } from '@modules/routing/router';

const router = new Router([
	{
		httpMethod: 'GET',
		path: '/',
		handler: (event: APIGatewayProxyEvent) => {
			console.log(`Input is ${JSON.stringify(event)}`);
			return Promise.resolve({ statusCode: 200, body: '' });
		},
	},
]);

export const handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => router.routeRequest(event);
