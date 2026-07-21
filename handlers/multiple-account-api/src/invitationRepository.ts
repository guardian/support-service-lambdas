import {
	DeleteItemCommand,
	DynamoDBClient,
	PutItemCommand,
	QueryCommand,
	type TransactWriteItem,
	UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import dayjs from 'dayjs';
import { z } from 'zod';
import { getMaybeSingleOrThrow } from '@modules/arrayFunctions';
import {
	type CancelledBy,
	cancelledBySchema,
} from '@modules/multiple-account/cancelledBySchema';
import type { Stage } from '@modules/stage';

// When an invitation is cancelled/rejected we keep the
// record for a short period (rather than hard deleting it) so we can tell who
// cancelled it, then let DynamoDB's TTL (expiryDate) remove it automatically.
export function invitationCancellationTTL(): number {
	return dayjs().add(2, 'weeks').unix();
}

export const invitationRecordSchema = z.object({
	subscriptionName: z.string(),
	invitationCode: z.string(),
	primaryIdentityId: z.string(),
	secondaryUserEmail: z.string(),
	secondaryIdentityId: z.string(),
	invitedDate: z.string(),
	expiryDate: z.number(),
	cancelledBy: cancelledBySchema.optional(),
	cancelledDate: z.iso.datetime().optional(),
});

export type InvitationRecord = z.infer<typeof invitationRecordSchema>;

export class InvitationRepository {
	constructor(
		private readonly client: DynamoDBClient,
		private readonly tableName: string,
	) {}

	static create(stage: Stage): InvitationRepository {
		return new InvitationRepository(
			new DynamoDBClient({}),
			`multiple-account-invitation-${stage}`,
		);
	}

	async save(record: InvitationRecord): Promise<void> {
		await this.client.send(
			new PutItemCommand({
				TableName: this.tableName,
				Item: marshall(record),
			}),
		);
	}

	async get(invitationCode: string): Promise<InvitationRecord | undefined> {
		const result = await this.client.send(
			new QueryCommand({
				TableName: this.tableName,
				IndexName: 'invitationCode-index',
				KeyConditionExpression: 'invitationCode = :invitationCode',
				ExpressionAttributeValues: {
					':invitationCode': { S: invitationCode },
				},
			}),
		);

		const item = getMaybeSingleOrThrow(
			result.Items ?? [],
			() =>
				new Error(
					`Multiple invitations found with the invitationCode ${invitationCode}`,
				),
		);
		if (!item) {
			return undefined;
		}
		return invitationRecordSchema.parse(unmarshall(item));
	}

	async list(subscriptionName: string): Promise<InvitationRecord[]> {
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
			invitationRecordSchema.parse(unmarshall(item)),
		);
	}

	async delete(
		subscriptionName: string,
		invitationCode: string,
	): Promise<void> {
		await this.client.send(
			new DeleteItemCommand({
				TableName: this.tableName,
				Key: {
					subscriptionName: { S: subscriptionName },
					invitationCode: { S: invitationCode },
				},
			}),
		);
	}

	async softDelete(
		subscriptionName: string,
		invitationCode: string,
		cancelledBy: CancelledBy,
	): Promise<void> {
		await this.client.send(
			new UpdateItemCommand({
				TableName: this.tableName,
				Key: {
					subscriptionName: { S: subscriptionName },
					invitationCode: { S: invitationCode },
				},
				UpdateExpression:
					'SET expiryDate = :expiryDate, cancelledBy = :cancelledBy, cancelledDate = :cancelledDate',
				ExpressionAttributeValues: {
					':expiryDate': { N: invitationCancellationTTL().toString() },
					':cancelledBy': { S: cancelledBy },
					':cancelledDate': { S: dayjs().toISOString() },
				},
			}),
		);
	}

	getDeleteTransaction(
		subscriptionName: string,
		invitationCode: string,
	): TransactWriteItem {
		return {
			Delete: {
				TableName: this.tableName,
				Key: {
					subscriptionName: { S: subscriptionName },
					invitationCode: { S: invitationCode },
				},
			},
		};
	}
}
