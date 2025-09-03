import type { Logger } from '@modules/logger';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { listenDisputeClosedHandler } from '../../src/handlers/disputeClosedHandler';

// Mock all dependencies
jest.mock('@modules/secrets-manager/getSecret', () => ({
	getSecretValue: jest.fn(),
}));

jest.mock('@modules/stage', () => ({
	stageFromEnvironment: jest.fn(() => 'TEST'),
}));

jest.mock('@modules/zuora/zuoraClient', () => ({
	ZuoraClient: {
		create: jest.fn(),
	},
}));

jest.mock('../../src/services', () => ({
	zuoraGetInvoiceFromStripeChargeId: jest.fn(),
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

		// Mock ZuoraClient
		const { ZuoraClient } = require('@modules/zuora/zuoraClient');
		ZuoraClient.create.mockResolvedValue({});

		// Mock zuora service
		const { zuoraGetInvoiceFromStripeChargeId } = require('../../src/services');
		zuoraGetInvoiceFromStripeChargeId.mockResolvedValue({
			invoice: { id: 'inv_123' },
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

		it('should create ZuoraClient with correct stage and logger', async () => {
			const { ZuoraClient } = require('@modules/zuora/zuoraClient');
			const handler = listenDisputeClosedHandler(mockLogger);
			await handler(mockEvent);

			expect(ZuoraClient.create).toHaveBeenCalledWith('TEST', mockLogger);
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
				expect.any(String),
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
				expect.any(String),
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
				expect.any(String),
			);
		});

		it('should handle ZuoraClient creation error', async () => {
			const { ZuoraClient } = require('@modules/zuora/zuoraClient');
			ZuoraClient.create.mockRejectedValue(new Error('Zuora client error'));

			const handler = listenDisputeClosedHandler(mockLogger);
			const result = await handler(mockEvent);

			expect(result.statusCode).toBe(500);
			const responseBody = JSON.parse(result.body);
			expect(responseBody.error).toBe('Internal server error');
			expect(mockLogger.log).toHaveBeenCalledWith(
				'Error processing dispute closed:',
				expect.any(String),
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
