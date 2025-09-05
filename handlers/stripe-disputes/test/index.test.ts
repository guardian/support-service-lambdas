import type { APIGatewayProxyEvent, SQSEvent } from 'aws-lambda';

// Simple mocks
const mockLogger = {
	log: jest.fn(),
	error: jest.fn(),
	mutableAddContext: jest.fn(),
};

const mockRouterInstance = {
	routeRequest: jest.fn(),
};

const mockHandleStripeWebhook = jest.fn();
const mockHandleSqsEvents = jest.fn();

jest.mock('@modules/logger', () => ({
	Logger: jest.fn(() => mockLogger),
}));

jest.mock('@modules/routing/router', () => ({
	Router: jest.fn(() => mockRouterInstance),
}));

jest.mock('../src/services', () => ({
	handleStripeWebhook: mockHandleStripeWebhook,
	handleSqsEvents: mockHandleSqsEvents,
}));

// Import after mocks
import { handler } from '../src';

describe('Main Handler', () => {
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

	const createMockSqsEvent = (
		eventType: 'dispute.created' | 'dispute.closed',
		disputeId: string,
	): SQSEvent => ({
		Records: [
			{
				messageId: 'test-message-id',
				receiptHandle: 'test-receipt-handle',
				body: JSON.stringify({
					eventType,
					webhookData: { data: { object: { id: disputeId } } },
					timestamp: '2023-11-04T10:00:00Z',
					disputeId,
				}),
				attributes: {
					ApproximateReceiveCount: '1',
					SentTimestamp: '1699099200000',
					SenderId: 'AIDAIT2UOQQY3AUEKVGXU',
					ApproximateFirstReceiveTimestamp: '1699099200000',
				},
				messageAttributes: {},
				md5OfBody: 'test-md5',
				eventSource: 'aws:sqs',
				eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
				awsRegion: 'us-east-1',
			},
		],
	});

	beforeEach(() => {
		jest.clearAllMocks();
		mockRouterInstance.routeRequest.mockResolvedValue({
			statusCode: 200,
			body: JSON.stringify({ success: true }),
		});
		mockHandleSqsEvents.mockResolvedValue(undefined);
	});

	describe('API Gateway Events (Webhook Mode)', () => {
		it('should route webhook requests through router', async () => {
			const event = createMockApiGatewayEvent(
				'/listen-dispute-created',
				'POST',
				'{}',
			);
			const mockContext = {} as any;
			const result = await handler(event, mockContext);

			expect(mockLogger.log).toHaveBeenCalledWith(
				'Processing API Gateway webhook event',
			);
			expect(mockRouterInstance.routeRequest).toHaveBeenCalledWith(event);
			expect(mockHandleSqsEvents).not.toHaveBeenCalled();
			expect(result).toBeDefined();
		});

		it('should log input and webhook response', async () => {
			const event = createMockApiGatewayEvent(
				'/listen-dispute-created',
				'POST',
				'{}',
			);
			const mockContext = {} as any;
			const mockResponse = {
				statusCode: 200,
				body: JSON.stringify({ success: true }),
			};
			mockRouterInstance.routeRequest.mockResolvedValue(mockResponse);

			const result = await handler(event, mockContext);

			expect(mockLogger.log).toHaveBeenCalledWith(
				`Input: ${JSON.stringify(event)}`,
			);
			expect(mockLogger.log).toHaveBeenCalledWith(
				`Webhook response: ${JSON.stringify(result)}`,
			);
		});

		it('should handle different webhook paths', async () => {
			const closedEvent = createMockApiGatewayEvent(
				'/listen-dispute-closed',
				'POST',
				'{}',
			);
			const mockContext = {} as any;

			await handler(closedEvent, mockContext);

			expect(mockRouterInstance.routeRequest).toHaveBeenCalledWith(closedEvent);
		});
	});

	describe('SQS Events (Async Processing Mode)', () => {
		it('should handle SQS dispute.created events', async () => {
			const event = createMockSqsEvent('dispute.created', 'du_test123');
			const mockContext = {} as any;

			const result = await handler(event, mockContext);

			expect(mockLogger.log).toHaveBeenCalledWith(
				'Processing 1 SQS dispute events',
			);
			expect(mockHandleSqsEvents).toHaveBeenCalledWith(mockLogger, event);
			expect(mockRouterInstance.routeRequest).not.toHaveBeenCalled();
			expect(mockLogger.log).toHaveBeenCalledWith(
				'SQS events processed successfully',
			);
			expect(result).toBeUndefined(); // SQS events return void
		});

		it('should handle SQS dispute.closed events', async () => {
			const event = createMockSqsEvent('dispute.closed', 'du_closed123');
			const mockContext = {} as any;

			const result = await handler(event, mockContext);

			expect(mockLogger.log).toHaveBeenCalledWith(
				'Processing 1 SQS dispute events',
			);
			expect(mockHandleSqsEvents).toHaveBeenCalledWith(mockLogger, event);
			expect(result).toBeUndefined();
		});

		it('should handle multiple SQS records', async () => {
			const multiRecordEvent: SQSEvent = {
				Records: [
					...createMockSqsEvent('dispute.created', 'du_1').Records,
					...createMockSqsEvent('dispute.closed', 'du_2').Records,
				],
			};
			const mockContext = {} as any;

			await handler(multiRecordEvent, mockContext);

			expect(mockLogger.log).toHaveBeenCalledWith(
				'Processing 2 SQS dispute events',
			);
			expect(mockHandleSqsEvents).toHaveBeenCalledWith(
				mockLogger,
				multiRecordEvent,
			);
		});

		it('should propagate SQS processing errors', async () => {
			const error = new Error('SQS processing failed');
			mockHandleSqsEvents.mockRejectedValue(error);
			const event = createMockSqsEvent('dispute.created', 'du_error');
			const mockContext = {} as any;

			await expect(handler(event, mockContext)).rejects.toThrow(
				'SQS processing failed',
			);
		});
	});

	describe('Event Type Detection', () => {
		it('should correctly identify API Gateway events', async () => {
			const apiEvent = createMockApiGatewayEvent('/test', 'POST', '{}');
			const mockContext = {} as any;

			await handler(apiEvent, mockContext);

			expect(mockLogger.log).toHaveBeenCalledWith(
				'Processing API Gateway webhook event',
			);
		});

		it('should correctly identify SQS events', async () => {
			const sqsEvent = createMockSqsEvent('dispute.created', 'du_test');
			const mockContext = {} as any;

			await handler(sqsEvent, mockContext);

			expect(mockLogger.log).toHaveBeenCalledWith(
				'Processing 1 SQS dispute events',
			);
		});

		it('should handle unknown event types', async () => {
			const unknownEvent = { unknown: 'event' } as any;
			const mockContext = {} as any;

			await expect(handler(unknownEvent, mockContext)).rejects.toThrow(
				'Unsupported event type',
			);

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Unknown event type received',
			);
		});
	});

	describe('Hybrid Handler Functionality', () => {
		it('should log input for all event types', async () => {
			const apiEvent = createMockApiGatewayEvent('/test', 'POST', '{}');
			const mockContext = {} as any;

			await handler(apiEvent, mockContext);

			expect(mockLogger.log).toHaveBeenCalledWith(
				`Input: ${JSON.stringify(apiEvent)}`,
			);
		});

		it('should handle both sync and async flows in the same handler', async () => {
			const mockContext = {} as any;

			// Test sync flow
			const apiEvent = createMockApiGatewayEvent(
				'/listen-dispute-created',
				'POST',
				'{}',
			);
			const apiResult = await handler(apiEvent, mockContext);
			expect(apiResult).toBeDefined(); // Returns APIGatewayProxyResult
			expect(mockRouterInstance.routeRequest).toHaveBeenCalledTimes(1);

			jest.clearAllMocks();

			// Test async flow
			const sqsEvent = createMockSqsEvent('dispute.created', 'du_test');
			const sqsResult = await handler(sqsEvent, mockContext);
			expect(sqsResult).toBeUndefined(); // Returns void
			expect(mockHandleSqsEvents).toHaveBeenCalledTimes(1);
		});
	});
});
