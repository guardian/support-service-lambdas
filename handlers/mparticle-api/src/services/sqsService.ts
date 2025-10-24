import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { logger } from '@modules/routing/logger';
import type {
	DeletionRequestBody,
	MessageAttributes,
	SQSMessageAttributes,
} from '../types/deletionMessage';
import { toSQSMessageAttributes } from '../types/deletionMessage';

/**
 * Service for interacting with SQS queues for deletion requests
 */
export class SQSService {
	private readonly client: SQSClient;

	constructor(region: string = 'eu-west-1') {
		this.client = new SQSClient({ region });
	}

	/**
	 * Send a message to the DLQ with updated attributes
	 * This is used when a deletion partially fails and needs retry
	 *
	 * @param queueUrl - The URL of the DLQ
	 * @param body - The deletion request body
	 * @param attributes - Updated message attributes tracking deletion status
	 */
	async sendToDLQ(
		queueUrl: string,
		body: DeletionRequestBody,
		attributes: MessageAttributes,
	): Promise<void> {
		try {
			const messageAttributes = toSQSMessageAttributes(attributes);

			logger.log(
				`Sending message to DLQ for user ${body.userId} with attributes:`,
				attributes,
			);

			const command = new SendMessageCommand({
				QueueUrl: queueUrl,
				MessageBody: JSON.stringify(body),
				MessageAttributes: this.convertToSQSFormat(messageAttributes),
			});

			const response = await this.client.send(command);

			logger.log(
				`Successfully sent message to DLQ. MessageId: ${response.MessageId}`,
			);
		} catch (error) {
			logger.error(`Failed to send message to DLQ for user ${body.userId}`, error);
			throw error;
		}
	}

	/**
	 * Convert our message attributes format to AWS SDK format
	 */
	private convertToSQSFormat(attributes: SQSMessageAttributes): Record<
		string,
		{
			DataType: string;
			StringValue?: string;
		}
	> {
		const result: Record<
			string,
			{
				DataType: string;
				StringValue?: string;
			}
		> = {};

		for (const [key, value] of Object.entries(attributes)) {
			result[key] = {
				DataType: value.dataType,
				StringValue: value.stringValue,
			};
		}

		return result;
	}
}
