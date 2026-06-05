import type { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../src/index';

describe('handler', () => {
	it('returns 400 for an empty body', async () => {
		const requestEvent = {
			path: '/tax-rate',
			httpMethod: 'POST',
			headers: {},
		} as unknown as APIGatewayProxyEvent;

		const response = await handler(requestEvent);

		expect(response.statusCode).toEqual(400);
	});
	it('returns 400 for an invalid productKey', async () => {
		const requestEvent = {
			path: '/tax-rate',
			httpMethod: 'POST',
			headers: {},
			body: JSON.stringify({
				productKey: 'InvalidProductKey',
			}),
		} as unknown as APIGatewayProxyEvent;

		const response = await handler(requestEvent);

		expect(response.statusCode).toEqual(400);
	});
});
