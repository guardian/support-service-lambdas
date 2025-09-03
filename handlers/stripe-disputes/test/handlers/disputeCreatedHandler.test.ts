import type { Logger } from '@modules/logger';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { listenDisputeCreatedHandler } from '../../src/handlers/disputeCreatedHandler';

// Mock all dependencies
jest.mock('@modules/secrets-manager/getSecret', () => ({
	getSecretValue: jest.fn(),
}));

jest.mock('@modules/stage', () => ({
	stageFromEnvironment: jest.fn(() => 'TEST'),
}));

jest.mock('../../src/services', () => ({
	upsertSalesforceObject: jest.fn(),
}));

describe('Dispute Created Handler', () => {
	const mockLogger: Logger = {
		log: jest.fn(),
		mutableAddContext: jest.fn(),
	} as any;

	const validWebhookPayload = {
		id: 'evt_test123',
		type: 'charge.dispute.created',
		data: {
			object: {
				id: 'du_test123',
				charge: 'ch_test123',
				amount: 10000,
				currency: 'usd',
				reason: 'fraudulent',
				status: 'needs_response',
				created: 1755775482,
				is_charge_refundable: true,
				payment_intent: 'pi_test123',
				evidence_details: {
					due_by: 1756511999,
					has_evidence: false,
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
		path: '/listen-dispute-created',
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

		// Setup default mocks
		const { upsertSalesforceObject } = require('../../src/services');

		upsertSalesforceObject.mockResolvedValue({
			id: 'sf_record_123',
			success: true,
			errors: [],
		});
	});

	describe('listenDisputeCreatedHandler', () => {
		it('should successfully process valid webhook', async () => {
			const handler = listenDisputeCreatedHandler(mockLogger);
			const result = await handler(mockEvent);

			expect(result.statusCode).toBe(200);
			const responseBody = JSON.parse(result.body);
			expect(responseBody).toEqual({
				success: true,
				salesforceId: 'sf_record_123',
				disputeId: 'du_test123',
			});
		});

		it('should add dispute ID to logger context', async () => {
			const handler = listenDisputeCreatedHandler(mockLogger);
			await handler(mockEvent);

			expect(mockLogger.mutableAddContext).toHaveBeenCalledWith('du_test123');
		});

		it('should log processing message', async () => {
			const handler = listenDisputeCreatedHandler(mockLogger);
			await handler(mockEvent);

			expect(mockLogger.log).toHaveBeenCalledWith(
				'Processing Stripe dispute created webhook',
			);
		});

		it('should call upsertSalesforceObject with correct parameters', async () => {
			const { upsertSalesforceObject } = require('../../src/services');
			const handler = listenDisputeCreatedHandler(mockLogger);
			await handler(mockEvent);

			expect(upsertSalesforceObject).toHaveBeenCalledWith(
				mockLogger,
				validWebhookPayload,
			);
		});

		it('should handle missing request body', async () => {
			const eventWithoutBody = { ...mockEvent, body: null };
			const handler = listenDisputeCreatedHandler(mockLogger);

			// The handler should catch the error and return 500
			const result = await handler(eventWithoutBody);

			expect(result.statusCode).toBe(500);
			const responseBody = JSON.parse(result.body);
			expect(responseBody.error).toBe('Internal server error');
			expect(mockLogger.log).toHaveBeenCalledWith(
				'Error processing dispute created:',
				expect.any(ReferenceError),
			);
		});

		it('should handle invalid JSON in body', async () => {
			const eventWithInvalidJSON = { ...mockEvent, body: 'invalid-json' };
			const handler = listenDisputeCreatedHandler(mockLogger);
			const result = await handler(eventWithInvalidJSON);

			expect(result.statusCode).toBe(500);
			const responseBody = JSON.parse(result.body);
			expect(responseBody.error).toBe('Internal server error');
			expect(mockLogger.log).toHaveBeenCalledWith(
				'Error processing dispute created:',
				expect.any(SyntaxError),
			);
		});

		it('should handle invalid webhook schema', async () => {
			const invalidPayload = { ...validWebhookPayload, type: 'invalid_type' };
			const eventWithInvalidPayload = {
				...mockEvent,
				body: JSON.stringify(invalidPayload),
			};
			const handler = listenDisputeCreatedHandler(mockLogger);
			const result = await handler(eventWithInvalidPayload);

			expect(result.statusCode).toBe(500);
			const responseBody = JSON.parse(result.body);
			expect(responseBody.error).toBe('Internal server error');
			expect(mockLogger.log).toHaveBeenCalledWith(
				'Error processing dispute created:',
				expect.any(Error),
			);
		});

		it('should handle Salesforce service error', async () => {
			const { upsertSalesforceObject } = require('../../src/services');
			upsertSalesforceObject.mockRejectedValue(new Error('Service failed'));

			const handler = listenDisputeCreatedHandler(mockLogger);
			const result = await handler(mockEvent);

			expect(result.statusCode).toBe(500);
			const responseBody = JSON.parse(result.body);
			expect(responseBody.error).toBe('Internal server error');
			expect(mockLogger.log).toHaveBeenCalledWith(
				'Error processing dispute created:',
				expect.any(Error),
			);
		});

		it('should log successful Salesforce upsert', async () => {
			const handler = listenDisputeCreatedHandler(mockLogger);
			await handler(mockEvent);

			expect(mockLogger.log).toHaveBeenCalledWith(
				'Payment Dispute upserted in Salesforce with ID: sf_record_123',
			);
		});
	});
});
