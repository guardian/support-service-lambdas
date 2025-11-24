import { SQSService } from '../../src/services/sqsService';
import { SendMessageCommand } from '@aws-sdk/client-sqs';
import { DeletionRequestBody, MessageAttributes } from '../../src/types/deletionMessage';

jest.mock('@modules/routing/logger', () => ({
logger: {
log: jest.fn(),
		error: jest.fn(),
		getCallerInfo: jest.fn(() => 'sqsService.test.ts'),
		wrapFn: jest.fn((fn) => fn),
	},
}));

jest.mock('@aws-sdk/client-sqs', () => {
	const actualModule = jest.requireActual('@aws-sdk/client-sqs');
	return {
		...actualModule,
		SQSClient: jest.fn().mockImplementation(() => ({
send: jest.fn(),
		})),
	};
});

describe('SQSService', () => {
	let sqsService: SQSService;
	let mockSend: jest.Mock;
	const dlqUrl = 'https://sqs.eu-west-1.amazonaws.com/123456789/test-dlq';

	beforeEach(() => {
		jest.clearAllMocks();
		sqsService = new SQSService('eu-west-1');
		mockSend = (sqsService as any).client.send as jest.Mock;
		mockSend.mockResolvedValue({
MessageId: 'test-message-id',
$metadata: {},
});
	});

	describe('sendToDLQ', () => {
		const body: DeletionRequestBody = {
			userId: 'test-user-123',
			email: 'test@example.com',
		};

		it('should send message to DLQ with correct attributes', async () => {
			const attributes: MessageAttributes = {
				mParticleDeleted: true,
				brazeDeleted: false,
				attemptCount: 1,
			};

			await sqsService.sendToDLQ(dlqUrl, body, attributes);

			expect(mockSend).toHaveBeenCalledTimes(1);
			const command = mockSend.mock.calls[0][0] as SendMessageCommand;
			expect(command).toBeInstanceOf(SendMessageCommand);
			expect(command.input.QueueUrl).toBe(dlqUrl);
			expect(command.input.MessageBody).toBe(JSON.stringify(body));
		});

		it('should convert message attributes to SQS format', async () => {
			const attributes: MessageAttributes = {
				mParticleDeleted: true,
				brazeDeleted: false,
				attemptCount: 2,
			};

			await sqsService.sendToDLQ(dlqUrl, body, attributes);

			const command = mockSend.mock.calls[0][0] as SendMessageCommand;
			const msgAttributes = command.input.MessageAttributes;

			expect(msgAttributes?.mParticleDeleted).toEqual({
DataType: 'String',
StringValue: 'true',
});
			expect(msgAttributes?.brazeDeleted).toEqual({
DataType: 'String',
StringValue: 'false',
});
			expect(msgAttributes?.attemptCount).toEqual({
DataType: 'String',
StringValue: '2',
});
		});

		it('should handle partial deletion states correctly', async () => {
			const attributes: MessageAttributes = {
				mParticleDeleted: false,
				brazeDeleted: true,
				attemptCount: 3,
			};

			await sqsService.sendToDLQ(dlqUrl, body, attributes);

			const command = mockSend.mock.calls[0][0] as SendMessageCommand;
			const msgAttributes = command.input.MessageAttributes;

			expect(msgAttributes?.mParticleDeleted?.StringValue).toBe('false');
			expect(msgAttributes?.brazeDeleted?.StringValue).toBe('true');
			expect(msgAttributes?.attemptCount?.StringValue).toBe('3');
		});

		it('should throw error if SQS send fails', async () => {
			const attributes: MessageAttributes = {
				mParticleDeleted: false,
				brazeDeleted: false,
				attemptCount: 1,
			};

			const error = new Error('SQS send failed');
			mockSend.mockRejectedValueOnce(error);

			await expect(sqsService.sendToDLQ(dlqUrl, body, attributes)).rejects.toThrow(
'SQS send failed',
);
		});

		it('should handle high attempt counts', async () => {
			const attributes: MessageAttributes = {
				mParticleDeleted: false,
				brazeDeleted: false,
				attemptCount: 10,
			};

			await sqsService.sendToDLQ(dlqUrl, body, attributes);

			const command = mockSend.mock.calls[0][0] as SendMessageCommand;
			expect(command.input.MessageAttributes?.attemptCount?.StringValue).toBe('10');
		});
	});
});
