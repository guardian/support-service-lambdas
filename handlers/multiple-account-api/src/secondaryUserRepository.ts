import {
	DeleteItemCommand,
	DynamoDBClient,
	PutItemCommand,
	QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { Stage } from '@modules/stage';
import { z } from 'zod';

const secondaryUserRecordSchema = z.object({
	subscriptionName: z.string(),
	secondaryIdentityId: z.string(),
	primaryIdentityId: z.string(),
	acceptedDate: z.string(),
	expiryDate: z.number(),
});

export type SecondaryUserRecord = z.infer<typeof secondaryUserRecordSchema>;

export class SecondaryUserRepository {
	constructor(
		private readonly client: DynamoDBClient,
		private readonly tableName: string,
	) {}

	static create(stage: Stage): SecondaryUserRepository {
		return new SecondaryUserRepository(
			new DynamoDBClient({}),
			`multiple-account-secondary-user-${stage}`,
		);
	}

	async save(record: SecondaryUserRecord): Promise<void> {
		await this.client.send(
			new PutItemCommand({
				TableName: this.tableName,
				Item: marshall(record),
			}),
		);
	}

	async get(secondaryIdentityId: string): Promise<SecondaryUserRecord[]> {
		const result = await this.client.send(
			new QueryCommand({
				TableName: this.tableName,
				IndexName: 'secondaryIdentityId-index',
				KeyConditionExpression: 'secondaryIdentityId = :secondaryIdentityId',
				ExpressionAttributeValues: {
					':secondaryIdentityId': { S: secondaryIdentityId },
				},
			}),
		);
		return (result.Items ?? []).map((item) =>
			secondaryUserRecordSchema.parse(unmarshall(item)),
		);
	}

	async list(subscriptionName: string): Promise<SecondaryUserRecord[]> {
		const result = await this.client.send(
			new QueryCommand({
				TableName: this.tableName,
				KeyConditionExpression: 'subscriptionName = :subscriptionName',
				ExpressionAttributeValues: {
					':subscriptionName': { S: subscriptionName },
				},
			}),
		);
		return (result.Items ?? []).map((item) =>
			secondaryUserRecordSchema.parse(unmarshall(item)),
		);
	}

	async delete(
		subscriptionName: string,
		secondaryIdentityId: string,
	): Promise<void> {
		await this.client.send(
			new DeleteItemCommand({
				TableName: this.tableName,
				Key: {
					subscriptionName: { S: subscriptionName },
					secondaryIdentityId: { S: secondaryIdentityId },
				},
			}),
		);
	}
}
