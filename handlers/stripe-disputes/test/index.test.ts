import { Logger } from '@modules/logger';
import { getSecretValue } from '@modules/secrets-manager/getSecret';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { handler } from '../src';

// Mock fetch globally
global.fetch = jest.fn();

// Mock the getSecretValue function
jest.mock('@modules/secrets-manager/getSecret', () => ({
	getSecretValue: jest.fn(),
}));

// Mock salesforce services
jest.mock('../src/services/salesforceCreate', () => ({
	upsertPaymentDisputeInSalesforce: jest.fn().mockResolvedValue({
		id: 'mock_salesforce_id',
		success: true,
	}),
}));

jest.mock('../src/services/stripeToSalesforceMapper', () => ({
	mapStripeDisputeToSalesforce: jest.fn().mockReturnValue({
		Dispute_ID__c: 'mock_dispute_id',
	}),
}));

jest.mock('../src/services/salesforceAuth', () => ({
	authenticateWithSalesforce: jest.fn().mockResolvedValue({
		access_token: 'mock_access_token',
		instance_url: 'https://mock.salesforce.com',
		id: 'https://login.salesforce.com/id/mock',
		token_type: 'Bearer',
		issued_at: '1234567890',
		signature: 'mock_signature',
	}),
}));

const validStripeDisputeWebhook = {
	id: 'evt_0RyWbnItVxyc3Q6nNuuOgbbN',
	type: 'charge.dispute.created',
	data: {
		object: {
			id: 'du_0RyWbmItVxyc3Q6nfUmdWln0',
			charge: 'ch_2RyWblItVxyc3Q6n1O2UvibN',
			amount: 100,
			currency: 'usd',
			reason: 'fraudulent',
			status: 'warning_needs_response',
			created: 1755775482,
			is_charge_refundable: true,
			payment_intent: 'pi_2RyWblItVxyc3Q6n1HTvnARE',
			evidence_details: {
				due_by: 1756511999,
				has_evidence: false,
			},
			payment_method_details: {
				card: {
					network_reason_code: '10',
				},
			},
		},
	},
};

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
	process.env.Stage = 'CODE';
	jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
	jest
		.spyOn(Logger.prototype, 'mutableAddContext')
		.mockImplementation(() => {});

	// Reset the getSecretValue mock to return test credentials
	(getSecretValue as jest.Mock).mockClear();
	(getSecretValue as jest.Mock).mockResolvedValue({
		client_id: 'test_client_id',
		client_secret: 'test_client_secret',
	});

	// Mock fetch for Salesforce authentication
	(global.fetch as jest.Mock).mockResolvedValue({
		ok: true,
		json: () =>
			Promise.resolve({
				access_token: 'mock_access_token',
				instance_url: 'https://mock.salesforce.com',
				id: 'https://login.salesforce.com/id/mock',
				token_type: 'Bearer',
				issued_at: '1234567890',
				signature: 'mock_signature',
			}),
	});
});

afterEach(() => {
	// Only clear spies, not module mocks
	jest.clearAllMocks();
	delete process.env.Stage;
});

describe('Stripe Disputes Webhook Handler', () => {
	describe('listenDisputeCreatedHandler', () => {
		it('should fail when body is missing', async () => {
			const event = mockEvent('/listen-dispute-created', 'POST', '');
			event.body = null;

			const result: APIGatewayProxyResult = await handler(event);

			expect(result.statusCode).toBe(500);
		});

		it('should fail when required Stripe fields are missing from body', async () => {
			const invalidRequestBody = {
				id: 'evt_123',
				type: 'charge.dispute.created',
				// Missing data.object
			};
			const event = mockEvent(
				'/listen-dispute-created',
				'POST',
				JSON.stringify(invalidRequestBody),
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

		it('should successfully process valid Stripe dispute webhook', async () => {
			const event = mockEvent(
				'/listen-dispute-created',
				'POST',
				JSON.stringify(validStripeDisputeWebhook),
			);

			const result: APIGatewayProxyResult = await handler(event);

			expect(result.statusCode).toBe(200);
			const responseBody = JSON.parse(result.body) as {
				success: boolean;
				salesforceId: string;
				disputeId: string;
			};
			expect(responseBody.success).toBe(true);
			expect(responseBody.salesforceId).toBe('mock_salesforce_id');
			expect(responseBody.disputeId).toBe('du_0RyWbmItVxyc3Q6nfUmdWln0');
		});

		it('should add dispute ID to logger context', async () => {
			const loggerSpy = jest.spyOn(Logger.prototype, 'mutableAddContext');
			const event = mockEvent(
				'/listen-dispute-created',
				'POST',
				JSON.stringify(validStripeDisputeWebhook),
			);

			await handler(event);

			expect(loggerSpy).toHaveBeenCalledWith('du_0RyWbmItVxyc3Q6nfUmdWln0');
		});

		it('should call getSecretValue for Salesforce credentials', async () => {
			const event = mockEvent(
				'/listen-dispute-created',
				'POST',
				JSON.stringify(validStripeDisputeWebhook),
			);

			await handler(event);

			expect(getSecretValue).toHaveBeenCalledWith(
				'CODE/Stripe/Dispute-webhook-secrets/salesforce',
			);
		});
	});

	describe('listenDisputeClosedHandler', () => {
		it('should call getSecretValue for Salesforce credentials', async () => {
			const closedWebhook = {
				...validStripeDisputeWebhook,
				type: 'charge.dispute.closed',
			};
			const event = mockEvent(
				'/listen-dispute-closed',
				'POST',
				JSON.stringify(closedWebhook),
			);

			await handler(event);

			expect(getSecretValue).toHaveBeenCalledWith(
				'CODE/Stripe/Dispute-webhook-secrets/salesforce',
			);
		});

		it('should add dispute ID to logger context', async () => {
			const loggerSpy = jest.spyOn(Logger.prototype, 'mutableAddContext');
			const closedWebhook = {
				...validStripeDisputeWebhook,
				type: 'charge.dispute.closed',
			};
			const event = mockEvent(
				'/listen-dispute-closed',
				'POST',
				JSON.stringify(closedWebhook),
			);

			await handler(event);

			expect(loggerSpy).toHaveBeenCalledWith('du_0RyWbmItVxyc3Q6nfUmdWln0');
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
			const event = mockEvent(
				'/listen-dispute-created',
				'POST',
				JSON.stringify(validStripeDisputeWebhook),
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
