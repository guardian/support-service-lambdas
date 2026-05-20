import { contributionsOnlyCountries } from '@modules/internationalisation/contributionsOnlyCountries';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { handler } from '../src/index';

describe('contributions-only-countries-api handler', () => {
	it('returns contributions-only countries', async () => {
		const callHandler = (
			event: APIGatewayProxyEvent,
		): Promise<APIGatewayProxyResult> =>
			(
				handler as unknown as (
					e: APIGatewayProxyEvent,
				) => Promise<APIGatewayProxyResult>
			)(event);

		const response = await callHandler({
			httpMethod: 'GET',
			resource: '/contributions-only-countries',
			path: '/contributions-only-countries',
			headers: {},
			multiValueHeaders: {},
			queryStringParameters: null,
			multiValueQueryStringParameters: null,
			pathParameters: null,
			stageVariables: null,
			requestContext: {} as never,
			body: null,
			isBase64Encoded: false,
		} as APIGatewayProxyEvent);

		expect(response.statusCode).toBe(200);
		expect(JSON.parse(response.body)).toEqual({
			contributionsOnlyCountries,
		});
	});
});
