import { Logger } from '@modules/logger';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { handler } from '../src';

const mockEvent = (
	path: string,
	httpMethod: string,
	body: string,
): APIGatewayProxyEvent =>
	({
		path,
		httpMethod,
		body,
		headers: {},
		multiValueHeaders: {},
		queryStringParameters: null,
		multiValueQueryStringParameters: null,
		pathParameters: {},
		stageVariables: null,
		requestContext: {
			accountId: 'test',
			apiId: 'test',
			protocol: 'HTTP/1.1',
			httpMethod,
			path,
			stage: 'test',
			requestId: 'test',
			requestTime: 'test',
			requestTimeEpoch: 123456789,
			identity: {
				cognitoIdentityPoolId: null,
				cognitoIdentityId: null,
				apiKey: null,
				principalOrgId: null,
				cognitoAuthenticationType: null,
				userArn: null,
				apiKeyId: null,
				userAgent: 'test',
				accountId: null,
				cognitoAuthenticationProvider: null,
				sourceIp: '127.0.0.1',
				accessKey: null,
			},
			resourceId: 'test',
			resourcePath: path,
			authorizer: {},
		},
		resource: path,
		isBase64Encoded: false,
	}) as APIGatewayProxyEvent;

beforeEach(() => {
	process.env.STAGE = 'TEST';
	jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
	jest
		.spyOn(Logger.prototype, 'mutableAddContext')
		.mockImplementation(() => {});
});

afterEach(() => {
	jest.restoreAllMocks();
	delete process.env.STAGE;
});

describe('Stripe Disputes Webhook Handler', () => {
	describe('listenDisputeCreatedHandler', () => {
		it('should fail when body is missing', async () => {
			const event = mockEvent('/listen-dispute-created', 'POST', '');
			event.body = null;

			const result: APIGatewayProxyResult = await handler(event);

			expect(result.statusCode).toBe(500);
		});

		it('should fail when subscriptionNumber is missing from body', async () => {
			const requestBody = {};
			const event = mockEvent(
				'/listen-dispute-created',
				'POST',
				JSON.stringify(requestBody),
			);

			const result: APIGatewayProxyResult = await handler(event);

			expect(result.statusCode).toBe(500);
		});

		it('should fail when body is invalid JSON', async () => {
			const event = mockEvent(
				'/listen-dispute-created',
				'POST',
				'invalid-json',
			);

			const result: APIGatewayProxyResult = await handler(event);

			expect(result.statusCode).toBe(500);
		});

		it('should add subscription number to logger context', async () => {
			const loggerSpy = jest.spyOn(Logger.prototype, 'mutableAddContext');
			const subscriptionNumber = 'A-S12345678';
			const requestBody = { subscriptionNumber };

			const event = mockEvent(
				'/listen-dispute-created',
				'POST',
				JSON.stringify(requestBody),
			);

			await handler(event);

			expect(loggerSpy).toHaveBeenCalledWith(subscriptionNumber);
		});
	});

	describe('Router', () => {
		it('should handle unsupported HTTP methods', async () => {
			const event = mockEvent('/listen-dispute-created', 'GET', '{}');

			const result: APIGatewayProxyResult = await handler(event);

			expect(result.statusCode).toBe(404);
		});

		it('should handle unsupported paths', async () => {
			const event = mockEvent('/unknown-path', 'POST', '{}');

			const result: APIGatewayProxyResult = await handler(event);

			expect(result.statusCode).toBe(404);
		});
	});

	describe('Logging', () => {
		it('should log input and output', async () => {
			const loggerSpy = jest.spyOn(Logger.prototype, 'log');
			const requestBody = { subscriptionNumber: 'A-S12345678' };

			const event = mockEvent(
				'/listen-dispute-created',
				'POST',
				JSON.stringify(requestBody),
			);

			const result: APIGatewayProxyResult = await handler(event);

			expect(loggerSpy).toHaveBeenCalledWith(
				`Input is ${JSON.stringify(event)}`,
			);
			expect(loggerSpy).toHaveBeenCalledWith(
				`Response is ${JSON.stringify(result)}`,
			);
		});
	});
});
