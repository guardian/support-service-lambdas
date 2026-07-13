import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
import { contributionsOnlyCountries } from '@modules/internationalisation/contributionsOnlyCountries';
import { logger } from '@modules/logger/logger';
import { ok } from '@modules/routing/apiGatewayResponses';
import { Router } from '@modules/routing/router';

const contributionsOnlyCountriesPath = '/contributions-only-countries';

export const handler: Handler = Router([
	{
		httpMethod: 'GET',
		path: contributionsOnlyCountriesPath,
		handler: handleRequest,
	},
]);

async function handleRequest(
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
	logger.log(
		`Received GET ${event.path} request for contributions-only countries list`,
		event,
	);

	return Promise.resolve(ok({ contributionsOnlyCountries }));
}
