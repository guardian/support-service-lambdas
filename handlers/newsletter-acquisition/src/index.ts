import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import type { SQSEvent } from 'aws-lambda';
import { z } from 'zod';

const messageSchema = z.object({
	userId: z.string(),
	newsletterId: z.string(),
	timestamp: z.string(),
});

export type NewsletterAcquisition = z.infer<typeof messageSchema>;

export function buildDynamoItem(message: NewsletterAcquisition) {
	return {
		userId: message.userId,
		sortKey: `${message.timestamp}#${message.newsletterId}`,
		newsletterId: message.newsletterId,
		timestamp: message.timestamp,
	};
}

const dynamoClient = new DynamoDBClient({});
const tableName = process.env.TABLE_NAME ?? '';

export const handler = async (event: SQSEvent): Promise<void> => {
	for (const record of event.Records) {
		const message = messageSchema.parse(JSON.parse(record.body));

		console.log(
			`Saving: userId=${message.userId}, newsletterId=${message.newsletterId}`,
		);

		await dynamoClient.send(
			new PutItemCommand({
				TableName: tableName,
				Item: marshall(buildDynamoItem(message)),
			}),
		);
	}
};
