import { putMetric } from '@modules/aws/cloudwatch';
import { Router } from '@modules/routing/router';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const validReferers = [
	'https://support.thegulocal.com/',
	'https://support.code.dev-theguardian.com/',
	'https://support.theguardian.com/',
];

const buildResponse = (statusCode: number) => ({
	statusCode,
	body: '',
	headers: { 'Cache-Control': 'private, no-store' },
});

const router = new Router([
	{
		httpMethod: 'GET',
		path: '/metric-push-api',
		handler: async (event: APIGatewayProxyEvent) => {
			console.log(`Input is ${JSON.stringify(event)}`);

			if (
				event.headers.referer &&
				validReferers.includes(event.headers.referer)
			) {
				await putMetric('metric-push-api-client-side-error');
				return Promise.resolve(buildResponse(201));
			} else {
				return Promise.resolve(buildResponse(204));
			}
		},
	},
]);

export const handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => router.routeRequest(event);
