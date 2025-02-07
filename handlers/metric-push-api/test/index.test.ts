import { handler } from '../src/index';

import { APIGatewayProxyEvent } from 'aws-lambda';

describe('handler', () => {
	it('returns 404 Not Found for an unknown path', async () => {
		const requestEvent = {
			path: '/bad/path',
			httpMethod: 'GET',
			headers: {},
		} as unknown as APIGatewayProxyEvent;

		const response = await handler(requestEvent);

		expect(response.statusCode).toEqual(404);
	});

	it('returns 404 Not Found for an unknown method', async () => {
		const requestEvent = {
			path: '/',
			httpMethod: 'POST',
			headers: {},
		} as unknown as APIGatewayProxyEvent;

		const response = await handler(requestEvent);

		expect(response.statusCode).toEqual(404);
	});

	describe('GET /', () => {
		it('returns 201 Accepted if the referer is valid', async () => {
			const requestEvent = {
				path: '/',
				httpMethod: 'GET',
				headers: {
					referer: 'https://support.thegulocal.com/',
				},
			} as unknown as APIGatewayProxyEvent;

			const response = await handler(requestEvent);

			expect(response.statusCode).toEqual(201);
		});

		it('returns 204 No Content if the referer is invalid', async () => {
			const requestEvent = {
				path: '/',
				httpMethod: 'GET',
				headers: {
					referer: 'https://www.example.com/',
				},
			} as unknown as APIGatewayProxyEvent;

			const response = await handler(requestEvent);

			expect(response.statusCode).toEqual(204);
		});

		it('returns 204 No Content if no referer is provided', async () => {
			const requestEvent = {
				path: '/',
				httpMethod: 'GET',
				headers: {},
			} as unknown as APIGatewayProxyEvent;

			const response = await handler(requestEvent);

			expect(response.statusCode).toEqual(204);
		});
	});
});
