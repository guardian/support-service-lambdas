import { GetQueueUrlCommand, SendMessageCommand } from '@aws-sdk/client-sqs';
import { sendMessageToQueue } from '../src/sqs';

describe('sqsModule', () => {
	describe('sendMessageToQueue', () => {
		it('should successfully send a message to the queue', async () => {
			const mockSend = jest.fn();
			const queueName = 'test-queue';
			const mockQueueUrl = `https://sqs.us-east-1.amazonaws.com/123456789012/${queueName}`;
			const messageBody = JSON.stringify({ key: 'value' });
			const mockResponse = {
				MessageId: 'test-message-id',
				MD5OfBody: 'test-md5',
			};

			mockSend
				.mockResolvedValueOnce({ QueueUrl: mockQueueUrl })
				.mockResolvedValueOnce(mockResponse);

			const result = await sendMessageToQueue({
				send: mockSend,
				queueName,
				messageBody,
			});

			expect(mockSend).toHaveBeenCalledTimes(2);
			expect(mockSend).toHaveBeenNthCalledWith(
				1,
				expect.any(GetQueueUrlCommand),
			);
			expect(mockSend).toHaveBeenNthCalledWith(
				2,
				expect.any(SendMessageCommand),
			);
			expect(result.MessageId).toBe(mockResponse.MessageId);
		});

		it('should throw an error when queue URL is not found', async () => {
			const mockSend = jest.fn();
			mockSend.mockResolvedValueOnce({ QueueUrl: undefined });

			await expect(
				sendMessageToQueue({
					send: mockSend,
					queueName: 'non-existent-queue',
					messageBody: 'test message',
				}),
			).rejects.toThrow('Queue URL not found');

			expect(mockSend).toHaveBeenCalledTimes(1);
			expect(mockSend).toHaveBeenCalledWith(expect.any(GetQueueUrlCommand));
		});

		it('should throw an error when GetQueueUrlCommand fails', async () => {
			const mockSend = jest.fn();
			const mockError = new Error('Queue not found');
			mockSend.mockRejectedValueOnce(mockError);

			await expect(
				sendMessageToQueue({
					send: mockSend,
					queueName: 'non-existent-queue',
					messageBody: 'test message',
				}),
			).rejects.toThrow('Queue not found');

			expect(mockSend).toHaveBeenCalledTimes(1);
		});

		it('should throw an error when SendMessageCommand fails', async () => {
			const mockSend = jest.fn();
			const mockQueueUrl =
				'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue';
			const mockError = new Error('Send message failed');

			mockSend
				.mockResolvedValueOnce({ QueueUrl: mockQueueUrl })
				.mockRejectedValueOnce(mockError);

			await expect(
				sendMessageToQueue({
					send: mockSend,
					queueName: 'test-queue',
					messageBody: 'test message',
				}),
			).rejects.toThrow('Send message failed');

			expect(mockSend).toHaveBeenCalledTimes(2);
		});

		it('should pass correct parameters to GetQueueUrlCommand', async () => {
			const mockSend = jest.fn();
			const mockQueueUrl =
				'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue';

			mockSend
				.mockResolvedValueOnce({ QueueUrl: mockQueueUrl })
				.mockResolvedValueOnce({ MessageId: 'test-id' });

			await sendMessageToQueue({
				send: mockSend,
				queueName: 'my-test-queue',
				messageBody: 'test message',
			});

			const getQueueUrlCall = (
				mockSend.mock.calls[0] as unknown[]
			)[0] as GetQueueUrlCommand;
			expect(getQueueUrlCall).toBeInstanceOf(GetQueueUrlCommand);
			expect(getQueueUrlCall.input).toEqual({ QueueName: 'my-test-queue' });
		});

		it('should pass correct parameters to SendMessageCommand', async () => {
			const mockSend = jest.fn();
			const mockQueueUrl =
				'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue';
			const testMessage = 'Hello from SQS test';

			mockSend
				.mockResolvedValueOnce({ QueueUrl: mockQueueUrl })
				.mockResolvedValueOnce({ MessageId: 'test-id' });

			await sendMessageToQueue({
				send: mockSend,
				queueName: 'test-queue',
				messageBody: testMessage,
			});

			const sendMessageCall = (
				mockSend.mock.calls[1] as unknown[]
			)[0] as SendMessageCommand;
			expect(sendMessageCall).toBeInstanceOf(SendMessageCommand);
			expect(sendMessageCall.input).toEqual({
				QueueUrl: mockQueueUrl,
				MessageBody: testMessage,
			});
		});
	});
});
