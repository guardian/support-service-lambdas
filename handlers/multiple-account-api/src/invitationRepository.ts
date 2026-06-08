import {
	DeleteItemCommand,
	DynamoDBClient,
	PutItemCommand,
	QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { Stage } from '@modules/stage';
import { z } from 'zod';

const invitationRecordSchema = z.object({
	subscriptionName: z.string(),
	invitationCode: z.string(),
	primaryIdentityId: z.string(),
	secondaryIdentityId: z.string(),
	invitedDate: z.string(),
	expiryDate: z.number(),
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
		const items = result.Items ?? [];

		if (items.length > 1) {
			throw new Error(
				`Multiple invitations found for invitation code ${invitationCode}`,
			);
		}

		const [invitation] = items;

		if (!invitation) {
			return undefined;
		}

		return invitationRecordSchema.parse(unmarshall(invitation));
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
}
