import { handler } from '../src/index';

import { APIGatewayProxyEvent } from 'aws-lambda';

describe('handler', () => {
	it('returns a 404 for an unknown path', async () => {
		const requestEvent = {
			path: '/bad/path',
			httpMethod: 'GET',
			headers: {},
		} as unknown as APIGatewayProxyEvent;

		const response = await handler(requestEvent);

		expect(response.statusCode).toEqual(404);
	});

	it('returns a 404 for an unknown method', async () => {
		const requestEvent = {
			path: '/',
			httpMethod: 'POST',
			headers: {},
		} as unknown as APIGatewayProxyEvent;

		const response = await handler(requestEvent);

		expect(response.statusCode).toEqual(404);
	});

	describe('GET /', () => {
		it('returns a 200', async () => {
			const requestEvent = {
				path: '/',
				httpMethod: 'GET',
				headers: {},
			} as unknown as APIGatewayProxyEvent;

			const response = await handler(requestEvent);

			expect(response.statusCode).toEqual(200);
		});
	});
});
