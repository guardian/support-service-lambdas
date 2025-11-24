import { SQSEvent, Context } from 'aws-lambda';
import { handlerDeletion } from '../src/index';
import { processUserDeletion } from '../src/apis/dataSubjectRequests/deleteUser';

jest.mock('../src/apis/dataSubjectRequests/deleteUser');
jest.mock('../src/services/config', () => ({
getAppConfig: jest.fn().mockResolvedValue({
workspace: {
id: 'test-workspace',
environment: 'test',
accountId: '12345',
mpApiKey: 'test-key',
mpApiSecret: 'test-secret',
},
braze: {
apiUrl: 'https://api.braze.com',
apiKey: 'test-braze-key',
},
mmaUserDeletionDlqUrl: 'https://sqs.eu-west-1.amazonaws.com/123456789/test-dlq',
}),
	getEnv: jest.fn().mockReturnValue('test'),
}));

jest.mock('@modules/routing/logger', () => ({
logger: {
log: jest.fn(),
		error: jest.fn(),
		getCallerInfo: jest.fn(() => 'index.test.ts'),
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
userId: 'user-123',
email: 'user@example.com',
}),
					attributes: {
						ApproximateReceiveCount: '1',
						SentTimestamp: '1234567890',
						SenderId: 'test-sender',
						ApproximateFirstReceiveTimestamp: '1234567890',
					},
					messageAttributes: {
						mParticleDeleted: {
							dataType: 'String',
							stringValue: 'false',
						},
						brazeDeleted: {
							dataType: 'String',
							stringValue: 'false',
						},
						attemptCount: {
							dataType: 'String',
							stringValue: '0',
						},
					},
					md5OfBody: 'test-md5',
					eventSource: 'aws:sqs',
					eventSourceARN: 'arn:aws:sqs:eu-west-1:123456789:test-queue',
					awsRegion: 'eu-west-1',
				},
			],
		};

		mockProcessUserDeletion.mockResolvedValue({
mParticleDeleted: true,
brazeDeleted: true,
allSucceeded: true,
});

		await handlerDeletion(event, mockContext, mockCallback);

		expect(mockProcessUserDeletion).toHaveBeenCalledTimes(1);
		expect(mockProcessUserDeletion).toHaveBeenCalledWith(
{ userId: 'user-123', email: 'user@example.com' },
{ mParticleDeleted: false, brazeDeleted: false, attemptCount: 0 },
expect.anything(),
			expect.anything(),
			'https://sqs.eu-west-1.amazonaws.com/123456789/test-dlq',
		);
	});

	it('should process multiple SQS messages', async () => {
		const event: SQSEvent = {
			Records: [
				{
					messageId: 'test-message-1',
					receiptHandle: 'test-receipt-1',
					body: JSON.stringify({
userId: 'user-123',
email: 'user1@example.com',
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
userId: 'user-456',
email: 'user2@example.com',
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

		mockProcessUserDeletion.mockResolvedValue({
mParticleDeleted: true,
brazeDeleted: true,
allSucceeded: true,
});

		await handlerDeletion(event, mockContext, mockCallback);

		expect(mockProcessUserDeletion).toHaveBeenCalledTimes(2);
	});

	it('should handle messages with partial deletion states', async () => {
		const event: SQSEvent = {
			Records: [
				{
					messageId: 'test-message-1',
					receiptHandle: 'test-receipt-1',
					body: JSON.stringify({
userId: 'user-789',
email: 'user@example.com',
}),
					attributes: {
						ApproximateReceiveCount: '1',
						SentTimestamp: '1234567890',
						SenderId: 'test-sender',
						ApproximateFirstReceiveTimestamp: '1234567890',
					},
					messageAttributes: {
						mParticleDeleted: {
							dataType: 'String',
							stringValue: 'true',
						},
						brazeDeleted: {
							dataType: 'String',
							stringValue: 'false',
						},
						attemptCount: {
							dataType: 'String',
							stringValue: '2',
						},
					},
					md5OfBody: 'test-md5',
					eventSource: 'aws:sqs',
					eventSourceARN: 'arn:aws:sqs:eu-west-1:123456789:test-queue',
					awsRegion: 'eu-west-1',
				},
			],
		};

		mockProcessUserDeletion.mockResolvedValue({
mParticleDeleted: true,
brazeDeleted: true,
allSucceeded: true,
});

		await handlerDeletion(event, mockContext, mockCallback);

		expect(mockProcessUserDeletion).toHaveBeenCalledWith(
{ userId: 'user-789', email: 'user@example.com' },
{ mParticleDeleted: true, brazeDeleted: false, attemptCount: 2 },
expect.anything(),
			expect.anything(),
			'https://sqs.eu-west-1.amazonaws.com/123456789/test-dlq',
		);
	});

	it('should throw error if message processing fails', async () => {
		const event: SQSEvent = {
			Records: [
				{
					messageId: 'test-message-1',
					receiptHandle: 'test-receipt-1',
					body: JSON.stringify({
userId: 'user-fail',
email: 'fail@example.com',
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

		await expect(handlerDeletion(event, mockContext, mockCallback)).rejects.toThrow('Processing failed');

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
					body: '{"userId":"json-user","email":"json@example.com"}',
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

		mockProcessUserDeletion.mockResolvedValue({
mParticleDeleted: true,
brazeDeleted: true,
allSucceeded: true,
});

		await handlerDeletion(event, mockContext, mockCallback);

		expect(mockProcessUserDeletion).toHaveBeenCalledWith(
{ userId: 'json-user', email: 'json@example.com' },
expect.anything(),
			expect.anything(),
			expect.anything(),
			expect.anything(),
		);
	});
});
