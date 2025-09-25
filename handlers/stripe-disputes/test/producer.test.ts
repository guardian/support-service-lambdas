import type { APIGatewayProxyEvent } from 'aws-lambda';

const mockLogger = {
	log: jest.fn(),
	error: jest.fn(),
	mutableAddContext: jest.fn(),
};

const mockRouterInstance = jest.fn();
const mockGetSecretValue = jest.fn();
const mockStageFromEnvironment = jest.fn();
const mockStripeWebhooksConstructEvent = jest.fn();

const mockStripeCredentials = {
	secret_key: 'sk_test_mock_secret_key',
};

jest.mock('@modules/routing/logger', () => ({
	Logger: jest.fn(() => mockLogger),
}));

jest.mock('@modules/routing/router', () => ({
	Router: jest.fn(() => mockRouterInstance),
}));

jest.mock('@modules/secrets-manager/getSecret', () => ({
	getSecretValue: mockGetSecretValue,
}));

jest.mock('@modules/stage', () => ({
	stageFromEnvironment: mockStageFromEnvironment,
}));

jest.mock('stripe', () => {
	return jest.fn().mockImplementation(() => ({
		webhooks: {
			constructEvent: mockStripeWebhooksConstructEvent,
		},
	}));
});

jest.mock('../src/services', () => ({
	handleStripeWebhook: jest.fn(() => jest.fn()),
}));

import { handler } from '../src/producer';

describe('Producer Handler', () => {
	const createMockApiGatewayEvent = (
		path: string,
		httpMethod: string,
		body: string,
		stripeSignature?: string,
	): APIGatewayProxyEvent => ({
		body,
		headers: stripeSignature ? { 'Stripe-Signature': stripeSignature } : {},
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
		mockRouterInstance.mockResolvedValue({
			statusCode: 200,
			body: JSON.stringify({ success: true }),
		});
		mockGetSecretValue.mockResolvedValue(mockStripeCredentials);
		mockStageFromEnvironment.mockReturnValue('CODE');
		mockStripeWebhooksConstructEvent.mockReturnValue({});
	});

	describe('Producer Webhook Processing', () => {
		it('should handle webhook requests with valid signature', async () => {
			const event = createMockApiGatewayEvent(
				'/listen-dispute-created',
				'POST',
				'{}',
				'valid_signature',
			);
			const result = await handler(event);

			expect(mockGetSecretValue).toHaveBeenCalledWith(
				'CODE/Stripe/ConnectedApp/StripeDisputeWebhooks',
			);
			expect(mockStripeWebhooksConstructEvent).toHaveBeenCalledWith(
				'"{}"',
				'valid_signature',
				'sk_test_mock_secret_key',
			);
			expect(mockLogger.log).toHaveBeenCalledWith(
				`Headers: ${JSON.stringify(event.headers)}`,
			);
			expect(mockLogger.log).toHaveBeenCalledWith(
				`Stripe-Signature: ${JSON.stringify(event.headers['Stripe-Signature'])}`,
			);
			expect(mockRouterInstance).toHaveBeenCalledWith(event);
			expect(result).toBeDefined();
		});

		it('should log producer input and response', async () => {
			const event = createMockApiGatewayEvent(
				'/listen-dispute-created',
				'POST',
				'{}',
				'valid_signature',
			);
			const mockResponse = {
				statusCode: 200,
				body: JSON.stringify({ success: true }),
			};
			mockRouterInstance.mockResolvedValue(mockResponse);

			const result = await handler(event);

			expect(mockLogger.log).toHaveBeenCalledWith(
				`Input: ${JSON.stringify(event)}`,
			);
			expect(mockLogger.log).toHaveBeenCalledWith(
				`Headers: ${JSON.stringify(event.headers)}`,
			);
			expect(mockLogger.log).toHaveBeenCalledWith(
				`Stripe-Signature: ${JSON.stringify(event.headers['Stripe-Signature'])}`,
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
				'valid_signature',
			);

			await handler(event);

			expect(mockRouterInstance).toHaveBeenCalledWith(event);
		});

		it('should handle dispute closed webhook', async () => {
			const event = createMockApiGatewayEvent(
				'/listen-dispute-closed',
				'POST',
				'{}',
				'valid_signature',
			);

			await handler(event);

			expect(mockRouterInstance).toHaveBeenCalledWith(event);
		});
	});

	describe('Stripe Signature Verification', () => {
		it('should return 400 when Stripe signature is missing', async () => {
			const event = createMockApiGatewayEvent(
				'/listen-dispute-created',
				'POST',
				'{}',
			);

			const result = await handler(event);

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Missing Stripe-Signature header',
			);
			expect(result).toEqual({
				statusCode: 400,
				body: JSON.stringify({ message: 'Missing Stripe-Signature header' }),
			});
			expect(mockRouterInstance).not.toHaveBeenCalled();
		});

		it('should return 403 when Stripe signature verification fails', async () => {
			const event = createMockApiGatewayEvent(
				'/listen-dispute-created',
				'POST',
				'{}',
				'invalid_signature',
			);

			const mockError = new Error('Invalid signature');
			mockStripeWebhooksConstructEvent.mockImplementation(() => {
				throw mockError;
			});

			const result = await handler(event);

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Error verifying Stripe webhook signature: Invalid signature',
			);
			expect(result).toEqual({
				statusCode: 403,
				body: JSON.stringify({ message: 'Webhook Error: Invalid signature' }),
			});
			expect(mockRouterInstance).not.toHaveBeenCalled();
		});

		it('should handle non-Error objects in signature verification', async () => {
			const event = createMockApiGatewayEvent(
				'/listen-dispute-created',
				'POST',
				'{}',
				'invalid_signature',
			);

			mockStripeWebhooksConstructEvent.mockImplementation(() => {
				throw 'String error';
			});

			const result = await handler(event);

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Error verifying Stripe webhook signature: Unknown error',
			);
			expect(result).toEqual({
				statusCode: 403,
				body: JSON.stringify({ message: 'Webhook Error: Unknown error' }),
			});
		});

		it('should retrieve Stripe credentials from correct secret path', async () => {
			mockStageFromEnvironment.mockReturnValue('PROD');

			const event = createMockApiGatewayEvent(
				'/listen-dispute-created',
				'POST',
				'{}',
				'valid_signature',
			);

			await handler(event);

			expect(mockGetSecretValue).toHaveBeenCalledWith(
				'PROD/Stripe/ConnectedApp/StripeDisputeWebhooks',
			);
		});
	});
});
