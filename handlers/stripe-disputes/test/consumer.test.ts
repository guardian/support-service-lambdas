import type { SQSEvent } from 'aws-lambda';

// Simple mocks
const mockLogger = {
	log: jest.fn(),
	error: jest.fn(),
	mutableAddContext: jest.fn(),
};

const mockHandleSqsEvents = jest.fn();

jest.mock('@modules/logger', () => ({
	Logger: jest.fn(() => mockLogger),
}));

jest.mock('../src/services', () => ({
	handleSqsEvents: mockHandleSqsEvents,
}));

// Import after mocks
import { handler } from '../src/consumer';

describe('Consumer Handler', () => {
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
		mockHandleSqsEvents.mockResolvedValue(undefined);
	});

	describe('SQS Event Processing', () => {
		it('should handle SQS events', async () => {
			const event = createMockSqsEvent('dispute.created', 'du_test123');

			const result = await handler(event);

			expect(mockLogger.log).toHaveBeenCalledWith(
				`Input: ${JSON.stringify(event)}`,
			);
			expect(mockHandleSqsEvents).toHaveBeenCalledWith(mockLogger, event);
			expect(mockLogger.log).toHaveBeenCalledWith(
				'SQS events processed successfully',
			);
			expect(result).toBeUndefined();
		});

		it('should handle processing errors', async () => {
			const error = new Error('Processing failed');
			mockHandleSqsEvents.mockRejectedValue(error);
			const event = createMockSqsEvent('dispute.created', 'du_error');

			await expect(handler(event)).rejects.toThrow('Processing failed');
		});

		it('should handle multiple SQS records', async () => {
			const multiRecordEvent: SQSEvent = {
				Records: [
					...createMockSqsEvent('dispute.created', 'du_1').Records,
					...createMockSqsEvent('dispute.closed', 'du_2').Records,
				],
			};

			await handler(multiRecordEvent);

			expect(mockLogger.log).toHaveBeenCalledWith(
				`Processing 2 SQS dispute events`,
			);
			expect(mockHandleSqsEvents).toHaveBeenCalledWith(
				mockLogger,
				multiRecordEvent,
			);
		});
	});
});
