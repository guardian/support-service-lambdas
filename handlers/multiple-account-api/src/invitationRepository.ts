import {
	DeleteItemCommand,
	DynamoDBClient,
	GetItemCommand,
	PutItemCommand,
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

	async get(
		subscriptionName: string,
		invitationCode: string,
	): Promise<InvitationRecord | undefined> {
		const result = await this.client.send(
			new GetItemCommand({
				TableName: this.tableName,
				Key: {
					subscriptionName: { S: subscriptionName },
					invitationCode: { S: invitationCode },
				},
			}),
		);
		if (!result.Item) {
			return undefined;
		}
		return invitationRecordSchema.parse(unmarshall(result.Item));
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
