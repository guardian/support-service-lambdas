import type { Logger } from '@modules/routing/logger';
import type { SQSEvent, SQSRecord } from 'aws-lambda';
import type {
	ListenDisputeClosedRequestBody,
	ListenDisputeCreatedRequestBody,
} from '../../src/dtos';
import { handleSqsEvents } from '../../src/services/sqsEventHandler';
import {
	handleListenDisputeClosed,
	handleListenDisputeCreated,
} from '../../src/sqs-consumers';

jest.mock('../../src/sqs-consumers', () => ({
	handleListenDisputeCreated: jest.fn(),
	handleListenDisputeClosed: jest.fn(),
}));

const mockHandleListenDisputeCreated =
	handleListenDisputeCreated as jest.MockedFunction<
		typeof handleListenDisputeCreated
	>;
const mockHandleListenDisputeClosed =
	handleListenDisputeClosed as jest.MockedFunction<
		typeof handleListenDisputeClosed
	>;

describe('handleSqsEvents', () => {
	const mockLogger: Logger = {
		log: jest.fn(),
		error: jest.fn(),
		mutableAddContext: jest.fn(),
		addContext: jest.fn(),
	} as any;

	const createSqsRecord = (
		eventType: 'dispute.created' | 'dispute.closed',
		disputeId: string,
		messageId: string = 'test-message-id',
	): SQSRecord => ({
		messageId,
		receiptHandle: 'test-receipt-handle',
		body: JSON.stringify({
			eventType,
			webhookData: {
				id: `evt_${disputeId}`,
				type:
					eventType === 'dispute.created'
						? 'charge.dispute.created'
						: 'charge.dispute.closed',
				data: {
					object: {
						id: disputeId,
						amount: 5000,
						currency: 'usd',
						charge: `ch_${disputeId}`,
						status: 'warning_needs_response',
						reason: 'fraudulent',
						created: 1699123456,
						is_charge_refundable: true,
						payment_intent: `pi_${disputeId}`,
						evidence_details: {
							due_by: 1699900800,
							has_evidence: false,
						},
						payment_method_details: {
							card: {
								network_reason_code: '4855',
							},
						},
					},
				},
			} as ListenDisputeCreatedRequestBody | ListenDisputeClosedRequestBody,
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
	});

	beforeEach(() => {
		jest.clearAllMocks();
		mockHandleListenDisputeCreated.mockResolvedValue({
			id: 'sf_created_123',
			success: true,
			errors: [],
		});
		mockHandleListenDisputeClosed.mockResolvedValue({
			id: 'sf_closed_123',
			success: true,
			errors: [],
		});
	});

	describe('successful processing', () => {
		it('should process dispute.created events', async () => {
			const sqsEvent: SQSEvent = {
				Records: [createSqsRecord('dispute.created', 'du_created123')],
			};

			await handleSqsEvents(mockLogger, sqsEvent);

			expect(mockLogger.log).toHaveBeenCalledWith(
				'Processing SQS record: test-message-id',
			);
			expect(mockLogger.mutableAddContext).toHaveBeenCalledWith(
				'du_created123',
			);
			expect(mockLogger.log).toHaveBeenCalledWith(
				'Processing dispute.created for dispute du_created123',
			);
			expect(mockHandleListenDisputeCreated).toHaveBeenCalledWith(
				mockLogger,
				expect.objectContaining({
					id: 'evt_du_created123',
					type: 'charge.dispute.created',
				}),
				'du_created123',
			);
			expect(mockHandleListenDisputeClosed).not.toHaveBeenCalled();
		});

		it('should process dispute.closed events', async () => {
			const sqsEvent: SQSEvent = {
				Records: [createSqsRecord('dispute.closed', 'du_closed123')],
			};

			await handleSqsEvents(mockLogger, sqsEvent);

			expect(mockLogger.log).toHaveBeenCalledWith(
				'Processing SQS record: test-message-id',
			);
			expect(mockLogger.mutableAddContext).toHaveBeenCalledWith('du_closed123');
			expect(mockLogger.log).toHaveBeenCalledWith(
				'Processing dispute.closed for dispute du_closed123',
			);
			expect(mockHandleListenDisputeClosed).toHaveBeenCalledWith(
				mockLogger,
				expect.objectContaining({
					id: 'evt_du_closed123',
					type: 'charge.dispute.closed',
				}),
				'du_closed123',
			);
			expect(mockHandleListenDisputeCreated).not.toHaveBeenCalled();
		});

		it('should process multiple records in parallel', async () => {
			const sqsEvent: SQSEvent = {
				Records: [
					createSqsRecord('dispute.created', 'du_created1', 'msg1'),
					createSqsRecord('dispute.closed', 'du_closed1', 'msg2'),
					createSqsRecord('dispute.created', 'du_created2', 'msg3'),
				],
			};

			await handleSqsEvents(mockLogger, sqsEvent);

			expect(mockHandleListenDisputeCreated).toHaveBeenCalledTimes(2);
			expect(mockHandleListenDisputeClosed).toHaveBeenCalledTimes(1);
			expect(mockLogger.log).toHaveBeenCalledWith(
				'Processing SQS record: msg1',
			);
			expect(mockLogger.log).toHaveBeenCalledWith(
				'Processing SQS record: msg2',
			);
			expect(mockLogger.log).toHaveBeenCalledWith(
				'Processing SQS record: msg3',
			);
		});
	});

	describe('error handling', () => {
		it('should handle JSON parsing errors', async () => {
			const invalidRecord: SQSRecord = {
				...createSqsRecord('dispute.created', 'du_test123'),
				body: 'invalid-json',
			};
			const sqsEvent: SQSEvent = { Records: [invalidRecord] };

			await expect(handleSqsEvents(mockLogger, sqsEvent)).rejects.toThrow();

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to process SQS record test-message-id:',
				expect.any(SyntaxError),
			);
		});

		it('should handle unknown event types', async () => {
			const unknownEventRecord = {
				...createSqsRecord('dispute.created', 'du_test123'),
				body: JSON.stringify({
					eventType: 'unknown.event',
					webhookData: {},
					timestamp: '2023-11-04T10:00:00Z',
					disputeId: 'du_test123',
				}),
			};
			const sqsEvent: SQSEvent = { Records: [unknownEventRecord] };

			await expect(handleSqsEvents(mockLogger, sqsEvent)).rejects.toThrow();

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to process SQS record test-message-id:',
				expect.objectContaining({
					message: 'Unknown event type: unknown.event',
				}),
			);
		});

		it('should handle consumer function errors', async () => {
			const error = new Error('Consumer processing failed');
			mockHandleListenDisputeCreated.mockRejectedValue(error);

			const sqsEvent: SQSEvent = {
				Records: [createSqsRecord('dispute.created', 'du_error123')],
			};

			await expect(handleSqsEvents(mockLogger, sqsEvent)).rejects.toThrow(
				'Consumer processing failed',
			);

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to process SQS record test-message-id:',
				error,
			);
		});

		it('should fail fast when any record fails in parallel processing', async () => {
			const error = new Error('Processing error');
			mockHandleListenDisputeCreated.mockResolvedValueOnce({
				id: 'sf_123',
				success: true,
				errors: [],
			});
			mockHandleListenDisputeClosed.mockRejectedValue(error);

			const sqsEvent: SQSEvent = {
				Records: [
					createSqsRecord('dispute.created', 'du_success', 'msg1'),
					createSqsRecord('dispute.closed', 'du_fail', 'msg2'),
				],
			};

			await expect(handleSqsEvents(mockLogger, sqsEvent)).rejects.toThrow(
				'Processing error',
			);

			expect(mockHandleListenDisputeCreated).toHaveBeenCalledTimes(1);
			expect(mockHandleListenDisputeClosed).toHaveBeenCalledTimes(1);
		});
	});

	describe('message parsing', () => {
		it('should correctly parse message body and extract dispute information', async () => {
			const disputeId = 'du_parse_test';
			const sqsEvent: SQSEvent = {
				Records: [createSqsRecord('dispute.created', disputeId)],
			};

			await handleSqsEvents(mockLogger, sqsEvent);

			expect(mockLogger.mutableAddContext).toHaveBeenCalledWith(disputeId);
			expect(mockHandleListenDisputeCreated).toHaveBeenCalledWith(
				mockLogger,
				expect.objectContaining({
					data: {
						object: expect.objectContaining({
							id: disputeId,
						}),
					},
				}),
				disputeId,
			);
		});

		it('should handle different message structures correctly', async () => {
			const customMessage = {
				eventType: 'dispute.closed',
				webhookData: {
					id: 'evt_custom123',
					type: 'dispute.closed',
					data: {
						object: {
							id: 'du_custom123',
							object: 'dispute',
							status: 'lost',
						},
					},
				},
				timestamp: '2023-11-04T12:00:00Z',
				disputeId: 'du_custom123',
			};

			const customRecord: SQSRecord = {
				...createSqsRecord('dispute.closed', 'du_custom123'),
				body: JSON.stringify(customMessage),
			};

			const sqsEvent: SQSEvent = { Records: [customRecord] };

			await handleSqsEvents(mockLogger, sqsEvent);

			expect(mockHandleListenDisputeClosed).toHaveBeenCalledWith(
				mockLogger,
				customMessage.webhookData,
				'du_custom123',
			);
		});
	});

	describe('logging behavior', () => {
		it('should log processing start and dispute context for each record', async () => {
			const sqsEvent: SQSEvent = {
				Records: [createSqsRecord('dispute.created', 'du_log_test')],
			};

			await handleSqsEvents(mockLogger, sqsEvent);

			expect(mockLogger.log).toHaveBeenCalledWith(
				'Processing SQS record: test-message-id',
			);
			expect(mockLogger.log).toHaveBeenCalledWith(
				'Processing dispute.created for dispute du_log_test',
			);
			expect(mockLogger.mutableAddContext).toHaveBeenCalledWith('du_log_test');
		});
	});
});
