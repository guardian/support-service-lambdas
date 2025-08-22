import type { Logger } from '@modules/logger';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { listenDisputeClosedHandler } from '../../src/handlers/dispute-closed.handler';

// Mock all dependencies
jest.mock('@modules/secrets-manager/getSecret', () => ({
	getSecretValue: jest.fn(),
}));

jest.mock('@modules/stage', () => ({
	stageFromEnvironment: jest.fn(() => 'TEST'),
}));

describe('Dispute Closed Handler', () => {
	const mockLogger: Logger = {
		log: jest.fn(),
		mutableAddContext: jest.fn(),
	} as any;

	const validWebhookPayload = {
		id: 'evt_test123',
		type: 'charge.dispute.closed',
		data: {
			object: {
				id: 'du_test123',
				charge: 'ch_test123',
				amount: 10000,
				currency: 'usd',
				reason: 'fraudulent',
				status: 'closed',
				created: 1755775482,
				is_charge_refundable: false,
				payment_intent: 'pi_test123',
				evidence_details: {
					due_by: 1756511999,
					has_evidence: true,
				},
				payment_method_details: {
					card: {
						network_reason_code: '4855',
					},
				},
			},
		},
	};

	const mockEvent: APIGatewayProxyEvent = {
		body: JSON.stringify(validWebhookPayload),
		headers: {},
		multiValueHeaders: {},
		httpMethod: 'POST',
		path: '/listen-dispute-closed',
		pathParameters: null,
		queryStringParameters: null,
		multiValueQueryStringParameters: null,
		stageVariables: null,
		isBase64Encoded: false,
		requestContext: {} as any,
		resource: '',
	};

	beforeEach(() => {
		jest.clearAllMocks();

		// Mock process.env.STAGE
		process.env.STAGE = 'TEST';

		// Setup default mocks
		const { getSecretValue } = require('@modules/secrets-manager/getSecret');
		getSecretValue.mockResolvedValue({
			client_id: 'test_client',
			client_secret: 'test_secret',
			username: 'test@example.com',
			password: 'password123',
			token: 'token456',
			sandbox: true,
		});
	});

	afterEach(() => {
		delete process.env.STAGE;
	});

	describe('listenDisputeClosedHandler', () => {
		it('should successfully process valid webhook', async () => {
			const handler = listenDisputeClosedHandler(mockLogger);
			const result = await handler(mockEvent);

			expect(result.statusCode).toBe(200);
			const responseBody = JSON.parse(result.body);
			expect(responseBody.message).toBe('Dispute closed webhook received');
			expect(responseBody.disputeId).toBe('du_test123');
			expect(responseBody.stage).toBe('TEST');
		});

		it('should add dispute ID to logger context', async () => {
			const handler = listenDisputeClosedHandler(mockLogger);
			await handler(mockEvent);

			expect(mockLogger.mutableAddContext).toHaveBeenCalledWith('du_test123');
		});

		it('should log processing message', async () => {
			const handler = listenDisputeClosedHandler(mockLogger);
			await handler(mockEvent);

			expect(mockLogger.log).toHaveBeenCalledWith(
				'Processing Stripe dispute closed webhook',
			);
		});

		it('should call getSecretValue with correct secret name', async () => {
			const { getSecretValue } = require('@modules/secrets-manager/getSecret');
			const handler = listenDisputeClosedHandler(mockLogger);
			await handler(mockEvent);

			expect(getSecretValue).toHaveBeenCalledWith(
				'TEST/Stripe/Dispute-webhook-secrets/salesforce',
			);
		});

		it('should handle missing request body', async () => {
			const eventWithoutBody = { ...mockEvent, body: null };
			const handler = listenDisputeClosedHandler(mockLogger);
			const result = await handler(eventWithoutBody);

			expect(result.statusCode).toBe(500);
			const responseBody = JSON.parse(result.body);
			expect(responseBody.error).toBe('Internal server error');
			expect(mockLogger.log).toHaveBeenCalledWith(
				'Error processing dispute closed:',
				expect.any(ReferenceError),
			);
		});

		it('should handle invalid JSON in body', async () => {
			const eventWithInvalidJSON = { ...mockEvent, body: 'invalid-json' };
			const handler = listenDisputeClosedHandler(mockLogger);
			const result = await handler(eventWithInvalidJSON);

			expect(result.statusCode).toBe(500);
			const responseBody = JSON.parse(result.body);
			expect(responseBody.error).toBe('Internal server error');
			expect(mockLogger.log).toHaveBeenCalledWith(
				'Error processing dispute closed:',
				expect.any(SyntaxError),
			);
		});

		it('should handle invalid webhook schema', async () => {
			const invalidPayload = { ...validWebhookPayload, type: 'invalid_type' };
			const eventWithInvalidPayload = {
				...mockEvent,
				body: JSON.stringify(invalidPayload),
			};
			const handler = listenDisputeClosedHandler(mockLogger);
			const result = await handler(eventWithInvalidPayload);

			expect(result.statusCode).toBe(500);
			const responseBody = JSON.parse(result.body);
			expect(responseBody.error).toBe('Internal server error');
			expect(mockLogger.log).toHaveBeenCalledWith(
				'Error processing dispute closed:',
				expect.any(Error),
			);
		});

		it('should handle getSecretValue error', async () => {
			const { getSecretValue } = require('@modules/secrets-manager/getSecret');
			getSecretValue.mockRejectedValue(new Error('Secret not found'));

			const handler = listenDisputeClosedHandler(mockLogger);
			const result = await handler(mockEvent);

			expect(result.statusCode).toBe(500);
			const responseBody = JSON.parse(result.body);
			expect(responseBody.error).toBe('Internal server error');
			expect(mockLogger.log).toHaveBeenCalledWith(
				'Error processing dispute closed:',
				expect.any(Error),
			);
		});

		it('should log error when exception occurs', async () => {
			const { getSecretValue } = require('@modules/secrets-manager/getSecret');
			getSecretValue.mockRejectedValue(new Error('Test error'));

			const handler = listenDisputeClosedHandler(mockLogger);
			await handler(mockEvent);

			expect(mockLogger.log).toHaveBeenCalledWith(
				'Error processing dispute closed:',
				expect.any(Error),
			);
		});

		it('should return correct response structure', async () => {
			const handler = listenDisputeClosedHandler(mockLogger);
			const result = await handler(mockEvent);

			const responseBody = JSON.parse(result.body);
			expect(responseBody).toEqual({
				message: 'Dispute closed webhook received',
				disputeId: 'du_test123',
				stage: 'TEST',
			});
		});
	});
});
