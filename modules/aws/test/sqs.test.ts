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
        it('should send a message to the specified SQS queue', async () => {
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
    });
});