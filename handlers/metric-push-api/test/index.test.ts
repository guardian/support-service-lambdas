import { putMetric } from '@modules/aws/cloudwatch';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../src/index';

jest.mock('@modules/aws/cloudwatch', () => ({
	putMetric: jest.fn(),
}));

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

			it('emits a cloudwatch metric', async () => {
				const requestEvent = {
					path: '/',
					httpMethod: 'GET',
					headers: {
						referer: 'https://support.thegulocal.com/',
					},
				} as unknown as APIGatewayProxyEvent;

				await handler(requestEvent);

				expect(putMetric).toHaveBeenCalledWith(
					'metric-push-api-client-side-error',
				);
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

			it('does not emit a cloudwatch metric', async () => {
				const requestEvent = {
					path: '/',
					httpMethod: 'GET',
					headers: {
						referer: 'https://www.example.com/',
					},
				} as unknown as APIGatewayProxyEvent;

				await handler(requestEvent);

				expect(putMetric).not.toHaveBeenCalled();
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

			it('does not emit a cloudwatch metric', async () => {
				const requestEvent = {
					path: '/',
					httpMethod: 'GET',
					headers: {},
				} as unknown as APIGatewayProxyEvent;

				await handler(requestEvent);

				expect(putMetric).not.toHaveBeenCalled();
			});
		});
	});
});
