import type { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../src/index';

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
		describe('if the referred is valid', () => {
			it('returns 201 Accepted', async () => {
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
		});

		describe('if the referer is invalid', () => {
			it('returns 204 No Content', async () => {
				const requestEvent = {
					path: '/',
					httpMethod: 'GET',
					headers: {
						referer: 'https://www.example.com/',
					},
				} as unknown as APIGatewayProxyEvent;

				const response = await handler(requestEvent);

				expect(response.statusCode).toEqual(204);
				expect(response.headers?.['Cache-Control']).toEqual(
					'private, no-store',
				);
			});
		});

		describe('if no referer is provided', () => {
			it('returns 204 No Content', async () => {
				const requestEvent = {
					path: '/',
					httpMethod: 'GET',
					headers: {},
				} as unknown as APIGatewayProxyEvent;

				const response = await handler(requestEvent);

				expect(response.statusCode).toEqual(204);
				expect(response.headers?.['Cache-Control']).toEqual(
					'private, no-store',
				);
			});
		});
	});
});
