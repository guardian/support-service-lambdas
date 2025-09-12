import type { APIGatewayProxyEvent } from 'aws-lambda';

const mockLogger = {
	log: jest.fn(),
	error: jest.fn(),
	mutableAddContext: jest.fn(),
};

const mockRouterInstance = {
	routeRequest: jest.fn(),
};

jest.mock('@modules/logger', () => ({
	Logger: jest.fn(() => mockLogger),
}));

jest.mock('@modules/routing/router', () => ({
	Router: jest.fn(() => mockRouterInstance),
}));

jest.mock('../src/services', () => ({
	handleStripeWebhook: jest.fn(() => jest.fn()),
}));

import { handler } from '../src/producer';

describe('Producer Handler', () => {
	const createMockApiGatewayEvent = (
		path: string,
		httpMethod: string,
		body: string,
	): APIGatewayProxyEvent => ({
		body,
		headers: {},
		multiValueHeaders: {},
		httpMethod,
		path,
		pathParameters: null,
		queryStringParameters: null,
		multiValueQueryStringParameters: null,
		stageVariables: null,
		isBase64Encoded: false,
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
				caller: null,
				clientCert: null,
				user: null,
			},
			resourceId: 'test',
			resourcePath: path,
			authorizer: {},
		},
		resource: path,
	});

	beforeEach(() => {
		jest.clearAllMocks();
		mockRouterInstance.routeRequest.mockResolvedValue({
			statusCode: 200,
			body: JSON.stringify({ success: true }),
		});
	});

	describe('Producer Webhook Processing', () => {
		it('should handle webhook requests', async () => {
			const event = createMockApiGatewayEvent(
				'/listen-dispute-created',
				'POST',
				'{}',
			);
			const result = await handler(event);

			expect(mockRouterInstance.routeRequest).toHaveBeenCalledWith(event);
			expect(result).toBeDefined();
		});

		it('should log producer input and response', async () => {
			const event = createMockApiGatewayEvent(
				'/listen-dispute-created',
				'POST',
				'{}',
			);
			const mockResponse = {
				statusCode: 200,
				body: JSON.stringify({ success: true }),
			};
			mockRouterInstance.routeRequest.mockResolvedValue(mockResponse);

			const result = await handler(event);

			expect(mockLogger.log).toHaveBeenCalledWith(
				`Input: ${JSON.stringify(event)}`,
			);
			expect(mockLogger.log).toHaveBeenCalledWith(
				`Webhook response: ${JSON.stringify(result)}`,
			);
		});

		it('should handle dispute created webhook', async () => {
			const event = createMockApiGatewayEvent(
				'/listen-dispute-created',
				'POST',
				'{}',
			);

			await handler(event);

			expect(mockRouterInstance.routeRequest).toHaveBeenCalledWith(event);
		});

		it('should handle dispute closed webhook', async () => {
			const event = createMockApiGatewayEvent(
				'/listen-dispute-closed',
				'POST',
				'{}',
			);

			await handler(event);

			expect(mockRouterInstance.routeRequest).toHaveBeenCalledWith(event);
		});
	});
});
