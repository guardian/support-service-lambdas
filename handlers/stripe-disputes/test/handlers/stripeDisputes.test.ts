import type { APIGatewayProxyEvent } from 'aws-lambda';
import {
	handler,
	processDisputeCreated,
	processDisputeUpdated,
	processDisputeClosed,
	processDisputeFundsReinstated,
	processDisputeFundsWithdrawn,
	type StripeEvent,
} from '../../src/handlers/stripeDisputes';

describe('stripeDisputes handler', () => {
	const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
	const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

	beforeEach(() => {
		jest.clearAllMocks();
		process.env.Stage = 'CODE';
		process.env.DISPUTE_RECORDS_TABLE = 'stripe-dispute-records-CODE';
		process.env.IDEMPOTENCY_TABLE = 'stripe-dispute-idempotency-CODE';
	});

	afterAll(() => {
		mockConsoleLog.mockRestore();
		mockConsoleError.mockRestore();
	});

	const createMockAPIGatewayEvent = (body: object): APIGatewayProxyEvent => ({
		body: JSON.stringify(body),
		headers: {
			'stripe-signature': 'test-signature',
		},
		httpMethod: 'POST',
		isBase64Encoded: false,
		path: '/stripe/webhook',
		pathParameters: null,
		queryStringParameters: null,
		multiValueQueryStringParameters: null,
		stageVariables: null,
		requestContext: {
			accountId: '123456789',
			apiId: 'test-api',
			authorizer: null,
			protocol: 'HTTP/1.1',
			httpMethod: 'POST',
			path: '/stripe/webhook',
			stage: 'CODE',
			requestId: 'test-request-id',
			requestTime: '01/Jan/2024:00:00:00 +0000',
			requestTimeEpoch: 1704067200000,
			identity: {
				cognitoIdentityPoolId: null,
				accountId: null,
				cognitoIdentityId: null,
				caller: null,
				sourceIp: '127.0.0.1',
				principalOrgId: null,
				accessKey: null,
				cognitoAuthenticationType: null,
				cognitoAuthenticationProvider: null,
				userArn: null,
				userAgent: 'Stripe/1.0',
				user: null,
				apiKey: null,
				apiKeyId: null,
				clientCert: null,
			},
			resourceId: 'test-resource',
			resourcePath: '/stripe/webhook',
			domainName: 'api.example.com',
			domainPrefix: 'api',
		},
		resource: '/stripe/webhook',
		multiValueHeaders: {
			'stripe-signature': ['test-signature'],
		},
	});

	describe('successful webhook processing', () => {
		it('should handle charge.dispute.created event', async () => {
			const stripeEvent: StripeEvent = {
				id: 'evt_123',
				type: 'charge.dispute.created',
				created: 1704067200,
				data: {
					object: {
						id: 'dp_123',
						amount: 5000,
						currency: 'gbp',
						reason: 'fraudulent',
						status: 'warning_needs_response',
					},
				},
			};

			const event = createMockAPIGatewayEvent(stripeEvent);
			const result = await handler(event);

			expect(result.statusCode).toBe(200);
			expect(JSON.parse(result.body)).toEqual({ received: true });
			expect(mockConsoleLog).toHaveBeenCalledWith(
				'Processing dispute created:',
				stripeEvent.data.object,
			);
		});

		it('should handle charge.dispute.updated event', async () => {
			const stripeEvent: StripeEvent = {
				id: 'evt_124',
				type: 'charge.dispute.updated',
				created: 1704067200,
				data: {
					object: {
						id: 'dp_123',
						amount: 5000,
						currency: 'gbp',
						reason: 'fraudulent',
						status: 'under_review',
					},
				},
			};

			const event = createMockAPIGatewayEvent(stripeEvent);
			const result = await handler(event);

			expect(result.statusCode).toBe(200);
			expect(JSON.parse(result.body)).toEqual({ received: true });
			expect(mockConsoleLog).toHaveBeenCalledWith(
				'Processing dispute updated:',
				stripeEvent.data.object,
			);
		});

		it('should handle charge.dispute.closed event', async () => {
			const stripeEvent: StripeEvent = {
				id: 'evt_125',
				type: 'charge.dispute.closed',
				created: 1704067200,
				data: {
					object: {
						id: 'dp_123',
						amount: 5000,
						currency: 'gbp',
						reason: 'fraudulent',
						status: 'lost',
					},
				},
			};

			const event = createMockAPIGatewayEvent(stripeEvent);
			const result = await handler(event);

			expect(result.statusCode).toBe(200);
			expect(JSON.parse(result.body)).toEqual({ received: true });
			expect(mockConsoleLog).toHaveBeenCalledWith(
				'Processing dispute closed:',
				stripeEvent.data.object,
			);
		});

		it('should handle charge.dispute.funds_reinstated event', async () => {
			const stripeEvent: StripeEvent = {
				id: 'evt_126',
				type: 'charge.dispute.funds_reinstated',
				created: 1704067200,
				data: {
					object: {
						id: 'dp_123',
						amount: 5000,
						currency: 'gbp',
						reason: 'fraudulent',
						status: 'won',
					},
				},
			};

			const event = createMockAPIGatewayEvent(stripeEvent);
			const result = await handler(event);

			expect(result.statusCode).toBe(200);
			expect(JSON.parse(result.body)).toEqual({ received: true });
			expect(mockConsoleLog).toHaveBeenCalledWith(
				'Processing dispute funds reinstated:',
				stripeEvent.data.object,
			);
		});

		it('should handle charge.dispute.funds_withdrawn event', async () => {
			const stripeEvent: StripeEvent = {
				id: 'evt_127',
				type: 'charge.dispute.funds_withdrawn',
				created: 1704067200,
				data: {
					object: {
						id: 'dp_123',
						amount: 5000,
						currency: 'gbp',
						reason: 'fraudulent',
						status: 'warning_closed',
					},
				},
			};

			const event = createMockAPIGatewayEvent(stripeEvent);
			const result = await handler(event);

			expect(result.statusCode).toBe(200);
			expect(JSON.parse(result.body)).toEqual({ received: true });
			expect(mockConsoleLog).toHaveBeenCalledWith(
				'Processing dispute funds withdrawn:',
				stripeEvent.data.object,
			);
		});

		it('should handle unrecognized event types gracefully', async () => {
			const stripeEvent = {
				id: 'evt_128',
				type: 'some.unknown.event',
				created: 1704067200,
				data: {
					object: {
						id: 'obj_123',
					},
				},
			};

			const event = createMockAPIGatewayEvent(stripeEvent);
			const result = await handler(event);

			expect(result.statusCode).toBe(200);
			expect(JSON.parse(result.body)).toEqual({ received: true });
			expect(mockConsoleLog).toHaveBeenCalledWith(
				'Unhandled event type: some.unknown.event',
			);
		});
	});

	describe('error handling', () => {
		it('should return 400 for invalid JSON body', async () => {
			const event = createMockAPIGatewayEvent({});
			event.body = 'invalid json {';

			const result = await handler(event);

			expect(result.statusCode).toBe(400);
			expect(JSON.parse(result.body)).toEqual({ error: 'Invalid request' });
			expect(mockConsoleError).toHaveBeenCalledWith(
				'Error processing webhook:',
				expect.any(Error),
			);
		});

		it('should handle missing body gracefully', async () => {
			const event = createMockAPIGatewayEvent({});
			event.body = null;

			const result = await handler(event);

			expect(result.statusCode).toBe(200);
			expect(JSON.parse(result.body)).toEqual({ received: true });
		});

		it('should handle empty body gracefully', async () => {
			const event = createMockAPIGatewayEvent({});
			event.body = '';

			const result = await handler(event);

			expect(result.statusCode).toBe(200);
			expect(JSON.parse(result.body)).toEqual({ received: true });
		});
	});

	describe('individual dispute processors', () => {
		it('processDisputeCreated should log dispute data', async () => {
			const disputeData = {
				id: 'dp_123',
				amount: 5000,
				currency: 'gbp',
			};

			await processDisputeCreated(disputeData);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				'Processing dispute created:',
				disputeData,
			);
		});

		it('processDisputeUpdated should log dispute data', async () => {
			const disputeData = {
				id: 'dp_123',
				status: 'under_review',
			};

			await processDisputeUpdated(disputeData);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				'Processing dispute updated:',
				disputeData,
			);
		});

		it('processDisputeClosed should log dispute data', async () => {
			const disputeData = {
				id: 'dp_123',
				status: 'lost',
			};

			await processDisputeClosed(disputeData);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				'Processing dispute closed:',
				disputeData,
			);
		});

		it('processDisputeFundsReinstated should log dispute data', async () => {
			const disputeData = {
				id: 'dp_123',
				status: 'won',
			};

			await processDisputeFundsReinstated(disputeData);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				'Processing dispute funds reinstated:',
				disputeData,
			);
		});

		it('processDisputeFundsWithdrawn should log dispute data', async () => {
			const disputeData = {
				id: 'dp_123',
				status: 'warning_closed',
			};

			await processDisputeFundsWithdrawn(disputeData);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				'Processing dispute funds withdrawn:',
				disputeData,
			);
		});
	});

	describe('webhook validation', () => {
		it('should log received event details', async () => {
			const stripeEvent: StripeEvent = {
				id: 'evt_129',
				type: 'charge.dispute.created',
				created: 1704067200,
				data: {
					object: {
						id: 'dp_123',
					},
				},
			};

			const event = createMockAPIGatewayEvent(stripeEvent);
			await handler(event);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				'Received Stripe webhook event:',
				expect.stringContaining('evt_129'),
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				'Stripe event type:',
				'charge.dispute.created',
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				'Stripe event data:',
				expect.stringContaining('dp_123'),
			);
		});
	});
});
