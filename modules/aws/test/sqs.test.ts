// Mock the SQS client before importing the module
const mockSend = jest.fn();

// Create mock constructors that return proper instances
const MockGetQueueUrlCommand = jest.fn().mockImplementation(function (this: any, input: any) {
    this.input = input;
    return this;
});

const MockSendMessageCommand = jest.fn().mockImplementation(function (this: any, input: any) {
    this.input = input;
    return this;
});

jest.mock('@aws-sdk/client-sqs', () => ({
    SQSClient: jest.fn().mockImplementation(() => ({
        send: mockSend,
    })),
    GetQueueUrlCommand: MockGetQueueUrlCommand,
    SendMessageCommand: MockSendMessageCommand,
}));

import { sendMessageToQueue } from '../src/sqs';

describe("sqsModule", () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('sendMessageToQueue', () => {
        it('should successfully send a message to the queue', async () => {
            const queueName = 'test-queue';
            const mockQueueUrl = `https://sqs.us-east-1.amazonaws.com/123456789012/${queueName}`;
            const messageBody = JSON.stringify({ key: 'value' });
            const mockResponse = {
                MessageId: 'test-message-id',
                MD5OfBody: 'test-md5',
            }

            // Mock the GetQueueUrlCommand response
            mockSend
                .mockResolvedValueOnce({ QueueUrl: mockQueueUrl })
                .mockResolvedValueOnce(mockResponse);

            const result = await sendMessageToQueue({ queueName, messageBody });

            expect(mockSend).toHaveBeenCalledTimes(2);
            expect(mockSend).toHaveBeenNthCalledWith(1, expect.any(MockGetQueueUrlCommand));
            expect(mockSend).toHaveBeenNthCalledWith(2, expect.any(MockSendMessageCommand));
            expect(result.MessageId).toBe(mockResponse.MessageId);
        });

        it('should throw an error when queue URL is not found', async () => {
            // Mock GetQueueUrlCommand to return undefined QueueUrl
            mockSend.mockResolvedValueOnce({ QueueUrl: undefined });

            await expect(
                sendMessageToQueue({
                    queueName: 'non-existent-queue',
                    messageBody: 'test message',
                }),
            ).rejects.toThrow('Queue URL not found');

            expect(mockSend).toHaveBeenCalledTimes(1);
            expect(mockSend).toHaveBeenCalledWith(expect.any(MockGetQueueUrlCommand));
        });

        it('should throw an error when GetQueueUrlCommand fails', async () => {
            const mockError = new Error('Queue not found');
            mockSend.mockRejectedValueOnce(mockError);

            await expect(
                sendMessageToQueue({
                    queueName: 'non-existent-queue',
                    messageBody: 'test message',
                }),
            ).rejects.toThrow('Queue not found');

            expect(mockSend).toHaveBeenCalledTimes(1);
        });

        it('should throw an error when SendMessageCommand fails', async () => {
            const mockQueueUrl =
                'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue';
            const mockError = new Error('Send message failed');

            mockSend
                .mockResolvedValueOnce({ QueueUrl: mockQueueUrl })
                .mockRejectedValueOnce(mockError);

            await expect(
                sendMessageToQueue({
                    queueName: 'test-queue',
                    messageBody: 'test message',
                }),
            ).rejects.toThrow('Send message failed');

            expect(mockSend).toHaveBeenCalledTimes(2);
        });

        it('should pass correct parameters to GetQueueUrlCommand', async () => {
            const mockQueueUrl =
                'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue';

            mockSend
                .mockResolvedValueOnce({ QueueUrl: mockQueueUrl })
                .mockResolvedValueOnce({ MessageId: 'test-id' });

            await sendMessageToQueue({
                queueName: 'my-test-queue',
                messageBody: 'test message',
            });

            const getQueueUrlCall = mockSend.mock.calls[0][0];
            expect(getQueueUrlCall).toBeInstanceOf(MockGetQueueUrlCommand);
            expect(getQueueUrlCall.input).toEqual({ QueueName: 'my-test-queue' });
        });

        it('should pass correct parameters to SendMessageCommand', async () => {
            const mockQueueUrl =
                'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue';
            const testMessage = 'Hello from SQS test';

            mockSend
                .mockResolvedValueOnce({ QueueUrl: mockQueueUrl })
                .mockResolvedValueOnce({ MessageId: 'test-id' });

            await sendMessageToQueue({
                queueName: 'test-queue',
                messageBody: testMessage,
            });

            const sendMessageCall = mockSend.mock.calls[1][0];
            expect(sendMessageCall).toBeInstanceOf(MockSendMessageCommand);
            expect(sendMessageCall.input).toEqual({
                QueueUrl: mockQueueUrl,
                MessageBody: testMessage,
            });
        });
    });
});