import { countries } from '@modules/contributions-only-countries-list';
import { logger } from '@modules/logger/logger';
import { ok } from '@modules/routing/apiGatewayResponses';
import { Router } from '@modules/routing/router';
import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';

export const handler: Handler = Router([
	{
		httpMethod: 'GET',
		path: '/',
		handler: handleRequest,
	},
]);

async function handleRequest(
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
	logger.log('Received GET / request for VAT countries list', event);

	return Promise.resolve(ok({ countries }));
}
