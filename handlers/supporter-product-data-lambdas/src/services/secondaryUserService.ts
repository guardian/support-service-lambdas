import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { awsConfig } from '@modules/aws/config';
import { logger } from '@modules/logger/logger';
import type { Stage } from '@modules/stage';
import { z } from 'zod';

const secondaryUserSchema = z.object({
	subscriptionName: z.string(),
	secondaryIdentityId: z.string(),
});

export type SecondaryUser = z.infer<typeof secondaryUserSchema>;

export class SecondaryUserService {
	constructor(
		private readonly tableName: string,
		private readonly client = new DynamoDBClient(awsConfig),
	) {}

	static create(stage: Stage): SecondaryUserService {
		return new SecondaryUserService(`multiple-account-secondary-user-${stage}`);
	}

	async listBySubscription(subscriptionName: string): Promise<SecondaryUser[]> {
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
		const items = result.Items ?? [];
		return items.flatMap((item) => {
			const subscriptionName = item['subscriptionName']?.S;
			const secondaryIdentityId = item['secondaryIdentityId']?.S;
			if (subscriptionName === undefined || secondaryIdentityId === undefined) {
				logger.log('Skipping secondary user record with missing fields', {
					item,
				});
				return [];
			}
			return secondaryUserSchema.parse({
				subscriptionName,
				secondaryIdentityId,
			});
		});
	}
}
