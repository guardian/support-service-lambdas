import type { Context, SQSEvent } from 'aws-lambda';
import { processUserDeletion } from '../src/apis/dataSubjectRequests/deleteUser';
import { handlerDeletion } from '../src/index';

jest.mock('../src/apis/dataSubjectRequests/deleteUser');
jest.mock('../src/services/config', () => ({
	getAppConfig: jest.fn().mockResolvedValue({
		workspace: {
			key: 'test-key',
			secret: 'test-secret',
		},
		inputPlatform: {
			key: 'input-key',
			secret: 'input-secret',
		},
		pod: 'EU1',
		sarResultsBucket: 'test-bucket',
		braze: {
			apiUrl: 'https://api.braze.com',
			apiKey: 'test-braze-key',
		},
	}),
	getEnv: jest.fn().mockReturnValue('test'),
}));

jest.mock('@modules/routing/logger', () => ({
	logger: {
		log: jest.fn(),
		error: jest.fn(),
		getCallerInfo: jest.fn(() => 'index.test.ts'),
		mutableAddContext: jest.fn(),
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return -- Mock wrapper function
		wrapFn: jest.fn((fn) => fn),
	},
}));

const mockProcessUserDeletion = processUserDeletion as jest.Mock;
const mockContext = {} as Context;
const mockCallback = jest.fn();

describe('handlerDeletion', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		console.log = jest.fn();
		console.error = jest.fn();
	});

	it('should process single SQS message successfully', async () => {
		const event: SQSEvent = {
			Records: [
				{
					messageId: 'test-message-1',
					receiptHandle: 'test-receipt-1',
					body: JSON.stringify({
						Type: 'Notification',
						Message: JSON.stringify({
							userId: 'user-123',
							email: 'user@example.com',
							eventType: 'DELETE',
							brazeId: 'braze-uuid-123',
						}),
					}),
					attributes: {
						ApproximateReceiveCount: '1',
						SentTimestamp: '1234567890',
						SenderId: 'test-sender',
						ApproximateFirstReceiveTimestamp: '1234567890',
					},
					messageAttributes: {},
					md5OfBody: 'test-md5',
					eventSource: 'aws:sqs',
					eventSourceARN: 'arn:aws:sqs:eu-west-1:123456789:test-queue',
					awsRegion: 'eu-west-1',
				},
			],
		};

		mockProcessUserDeletion.mockResolvedValue(undefined);

		await handlerDeletion(event, mockContext, mockCallback);

		expect(mockProcessUserDeletion).toHaveBeenCalledTimes(1);
		expect(mockProcessUserDeletion).toHaveBeenCalledWith(
			'user-123',
			'braze-uuid-123',
			expect.anything(),
			expect.anything(),
			'development',
		);
	});

	it('should process multiple SQS messages', async () => {
		const event: SQSEvent = {
			Records: [
				{
					messageId: 'test-message-1',
					receiptHandle: 'test-receipt-1',
					body: JSON.stringify({
						Type: 'Notification',
						Message: JSON.stringify({
							userId: 'user-123',
							email: 'user1@example.com',
							eventType: 'DELETE',
							brazeId: 'braze-uuid-123',
						}),
					}),
					attributes: {
						ApproximateReceiveCount: '1',
						SentTimestamp: '1234567890',
						SenderId: 'test-sender',
						ApproximateFirstReceiveTimestamp: '1234567890',
					},
					messageAttributes: {},
					md5OfBody: 'test-md5',
					eventSource: 'aws:sqs',
					eventSourceARN: 'arn:aws:sqs:eu-west-1:123456789:test-queue',
					awsRegion: 'eu-west-1',
				},
				{
					messageId: 'test-message-2',
					receiptHandle: 'test-receipt-2',
					body: JSON.stringify({
						Type: 'Notification',
						Message: JSON.stringify({
							userId: 'user-456',
							email: 'user2@example.com',
							eventType: 'DELETE',
							brazeId: 'braze-uuid-456',
						}),
					}),
					attributes: {
						ApproximateReceiveCount: '1',
						SentTimestamp: '1234567890',
						SenderId: 'test-sender',
						ApproximateFirstReceiveTimestamp: '1234567890',
					},
					messageAttributes: {},
					md5OfBody: 'test-md5-2',
					eventSource: 'aws:sqs',
					eventSourceARN: 'arn:aws:sqs:eu-west-1:123456789:test-queue',
					awsRegion: 'eu-west-1',
				},
			],
		};

		mockProcessUserDeletion.mockResolvedValue(undefined);

		await handlerDeletion(event, mockContext, mockCallback);

		expect(mockProcessUserDeletion).toHaveBeenCalledTimes(2);
	});

	it('should throw error if message processing fails', async () => {
		const event: SQSEvent = {
			Records: [
				{
					messageId: 'test-message-1',
					receiptHandle: 'test-receipt-1',
					body: JSON.stringify({
						Type: 'Notification',
						Message: JSON.stringify({
							userId: 'user-fail',
							email: 'fail@example.com',
							eventType: 'DELETE',
							brazeId: 'braze-uuid-fail',
						}),
					}),
					attributes: {
						ApproximateReceiveCount: '1',
						SentTimestamp: '1234567890',
						SenderId: 'test-sender',
						ApproximateFirstReceiveTimestamp: '1234567890',
					},
					messageAttributes: {},
					md5OfBody: 'test-md5',
					eventSource: 'aws:sqs',
					eventSourceARN: 'arn:aws:sqs:eu-west-1:123456789:test-queue',
					awsRegion: 'eu-west-1',
				},
			],
		};

		mockProcessUserDeletion.mockRejectedValue(new Error('Processing failed'));

		await expect(
			handlerDeletion(event, mockContext, mockCallback),
		).rejects.toThrow('Processing failed');

		expect(mockProcessUserDeletion).toHaveBeenCalledTimes(1);
	});

	it('should handle empty SQS event', async () => {
		const event: SQSEvent = {
			Records: [],
		};

		await handlerDeletion(event, mockContext, mockCallback);

		expect(mockProcessUserDeletion).not.toHaveBeenCalled();
	});

	it('should parse JSON body correctly', async () => {
		const event: SQSEvent = {
			Records: [
				{
					messageId: 'test-message-1',
					receiptHandle: 'test-receipt-1',
					body: JSON.stringify({
						Type: 'Notification',
						Message: JSON.stringify({
							userId: 'json-user',
							email: 'json@example.com',
							eventType: 'DELETE',
							brazeId: 'json-braze-uuid',
						}),
					}),
					attributes: {
						ApproximateReceiveCount: '1',
						SentTimestamp: '1234567890',
						SenderId: 'test-sender',
						ApproximateFirstReceiveTimestamp: '1234567890',
					},
					messageAttributes: {},
					md5OfBody: 'test-md5',
					eventSource: 'aws:sqs',
					eventSourceARN: 'arn:aws:sqs:eu-west-1:123456789:test-queue',
					awsRegion: 'eu-west-1',
				},
			],
		};

		mockProcessUserDeletion.mockResolvedValue(undefined);

		await handlerDeletion(event, mockContext, mockCallback);

		expect(mockProcessUserDeletion).toHaveBeenCalledWith(
			'json-user',
			'json-braze-uuid',
			expect.anything(),
			expect.anything(),
			'development',
		);
	});

	it('should handle message without brazeId', async () => {
		const event: SQSEvent = {
			Records: [
				{
					messageId: 'test-message-1',
					receiptHandle: 'test-receipt-1',
					body: JSON.stringify({
						Type: 'Notification',
						Message: JSON.stringify({
							userId: 'no-braze-user',
							email: 'nobraze@example.com',
							eventType: 'DELETE',
						}),
					}),
					attributes: {
						ApproximateReceiveCount: '1',
						SentTimestamp: '1234567890',
						SenderId: 'test-sender',
						ApproximateFirstReceiveTimestamp: '1234567890',
					},
					messageAttributes: {},
					md5OfBody: 'test-md5',
					eventSource: 'aws:sqs',
					eventSourceARN: 'arn:aws:sqs:eu-west-1:123456789:test-queue',
					awsRegion: 'eu-west-1',
				},
			],
		};

		mockProcessUserDeletion.mockResolvedValue(undefined);

		await handlerDeletion(event, mockContext, mockCallback);

		expect(mockProcessUserDeletion).toHaveBeenCalledWith(
			'no-braze-user',
			undefined,
			expect.anything(),
			expect.anything(),
			'development',
		);
	});
});
