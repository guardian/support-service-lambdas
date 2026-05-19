import { countries } from '@modules/vat-countries-list';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { handler } from '../src/index';

describe('vat-countries-list-api handler', () => {
	it('returns VAT countries', async () => {
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
			resource: '/',
			path: '/',
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
		expect(JSON.parse(response.body)).toEqual({ countries });
	});
});
