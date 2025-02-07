import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Router } from '@modules/routing/router';

const validReferers = [
	'https://support.thegulocal.com/',
	'https://support.code.dev-theguardian.com/',
	'https://support.theguardian.com/',
];

const router = new Router([
	{
		httpMethod: 'GET',
		path: '/',
		handler: (event: APIGatewayProxyEvent) => {
			console.log(`Input is ${JSON.stringify(event)}`);

			if (
				event.headers?.referer &&
				validReferers.includes(event.headers.referer)
			) {
				return Promise.resolve({ statusCode: 201, body: '' });
			} else {
				return Promise.resolve({ statusCode: 204, body: '' });
			}
		},
	},
]);

export const handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => router.routeRequest(event);
