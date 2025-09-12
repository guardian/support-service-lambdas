import { putMetric } from '@modules/aws/cloudwatch';
import type { Logger } from '@modules/routing/logger';
import { Router } from '@modules/routing/router';
import type { APIGatewayProxyEvent } from 'aws-lambda';

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

export const handler = Router([
	{
		httpMethod: 'GET',
		path: '/metric-push-api',
		handler: async (logger: Logger, event: APIGatewayProxyEvent) => {
			const referer = event.headers.referer ?? event.headers.Referer;

			if (referer && validReferers.includes(referer)) {
				await putMetric('metric-push-api-client-side-error');
				return Promise.resolve(buildResponse(201));
			} else {
				return Promise.resolve(buildResponse(204));
			}
		},
	},
]);
