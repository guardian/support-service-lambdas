import {
	DeleteItemCommand,
	DynamoDBClient,
	GetItemCommand,
	PutItemCommand,
	QueryCommand,
	type TransactWriteItem,
	UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import dayjs, { type Dayjs } from 'dayjs';
import { z } from 'zod';
import { logger } from '@modules/logger/logger';
import {
	type CancelledBy,
	cancelledBySchema,
} from '@modules/multiple-account/cancelledBySchema';
import type { Stage } from '@modules/stage';

export const secondaryUserRecordSchema = z.object({
	subscriptionName: z.string(),
	secondaryIdentityId: z.string(),
	primaryIdentityId: z.string(),
	acceptedDate: z.iso.datetime(),
	expiryDate: z.number(),
	cancelledBy: cancelledBySchema.optional(),
	cancelledDate: z.iso.datetime().optional(),
	invitationCode: z.string(),
});

export function secondaryUserTTLFromPrimarySubscriptionTTL(primaryTTL: Dayjs) {
	return primaryTTL.add(2, 'weeks').unix();
}

// When a secondary user is removed we keep the record for a short period
// (rather than hard deleting it) so we can tell who cancelled it, then let
// DynamoDB's TTL (expiryDate) remove it automatically.
export function secondaryUserCancellationTTL(): number {
	return dayjs().add(2, 'weeks').unix();
}

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

	async listByIdentity(
		secondaryIdentityId: string,
	): Promise<SecondaryUserRecord[]> {
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

	async listNonCancelledByIdentity(
		secondaryIdentityId: string,
	): Promise<SecondaryUserRecord[]> {
		return (await this.listByIdentity(secondaryIdentityId)).filter(
			(secondaryUser) => secondaryUser.cancelledBy === undefined,
		);
	}

	async getBySubscriptionAndIdentity(
		subscriptionName: string,
		secondaryIdentityId: string,
	): Promise<SecondaryUserRecord | undefined> {
		const result = await this.client.send(
			new GetItemCommand({
				TableName: this.tableName,
				Key: {
					subscriptionName: { S: subscriptionName },
					secondaryIdentityId: { S: secondaryIdentityId },
				},
			}),
		);
		if (!result.Item) {
			return undefined;
		}
		return secondaryUserRecordSchema.parse(unmarshall(result.Item));
	}

	async getNonCancelledBySubscriptionAndIdentity(
		subscriptionName: string,
		secondaryIdentityId: string,
	): Promise<SecondaryUserRecord | undefined> {
		const secondaryUser = await this.getBySubscriptionAndIdentity(
			subscriptionName,
			secondaryIdentityId,
		);
		if (!secondaryUser || secondaryUser.cancelledBy !== undefined) {
			return undefined;
		}
		return secondaryUser;
	}

	async listBySubscription(
		subscriptionName: string,
	): Promise<SecondaryUserRecord[]> {
		logger.log(
			`Querying secondary users for primary subscription ${subscriptionName}`,
		);
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

	async listNonCancelledBySubscription(
		subscriptionName: string,
	): Promise<SecondaryUserRecord[]> {
		return (await this.listBySubscription(subscriptionName)).filter(
			(secondaryUser) => secondaryUser.cancelledBy === undefined,
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

	getDeleteTransaction(
		subscriptionName: string,
		secondaryIdentityId: string,
	): TransactWriteItem {
		return {
			Delete: {
				TableName: this.tableName,
				Key: {
					subscriptionName: { S: subscriptionName },
					secondaryIdentityId: { S: secondaryIdentityId },
				},
			},
		};
	}

	getSoftDeleteTransaction(
		subscriptionName: string,
		secondaryIdentityId: string,
		cancelledBy: CancelledBy,
	): TransactWriteItem {
		return {
			Update: {
				TableName: this.tableName,
				Key: {
					subscriptionName: { S: subscriptionName },
					secondaryIdentityId: { S: secondaryIdentityId },
				},
				UpdateExpression:
					'SET expiryDate = :expiryDate, cancelledBy = :cancelledBy, cancelledDate = :cancelledDate',
				ExpressionAttributeValues: {
					':expiryDate': { N: secondaryUserCancellationTTL().toString() },
					':cancelledBy': { S: cancelledBy },
					':cancelledDate': { S: dayjs().toISOString() },
				},
			},
		};
	}

	async updateTTL(
		subscriptionName: string,
		secondaryIdentityId: string,
		expiryDate: number,
	): Promise<void> {
		await this.client.send(
			new UpdateItemCommand({
				TableName: this.tableName,
				Key: {
					subscriptionName: { S: subscriptionName },
					secondaryIdentityId: { S: secondaryIdentityId },
				},
				UpdateExpression: 'SET expiryDate = :expiryDate',
				ExpressionAttributeValues: {
					':expiryDate': { N: expiryDate.toString() },
				},
			}),
		);
	}

	getPutTransaction(record: SecondaryUserRecord): TransactWriteItem {
		return {
			Put: {
				TableName: this.tableName,
				Item: marshall(record),
			},
		};
	}
}
