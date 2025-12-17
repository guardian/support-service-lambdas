import type { AttributeValue as SDKAttributeValue } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import type {
	PromoCampaign,
	promoProductSchema,
} from '@modules/promotions/v2/schema';
import type { Stage } from '@modules/stage';
import type {
	DynamoDBBatchResponse,
	DynamoDBRecord,
	DynamoDBStreamEvent,
} from 'aws-lambda';
import type { AttributeValue } from 'aws-lambda/trigger/dynamodb-stream';
import { z } from 'zod';
import { deleteFromDynamoDb, writeToDynamoDb } from '../lib/dynamodb';

const oldPromoCampaignSchema = z.object({
	code: z.string(),
	group: z.enum([
		'supporterPlus',
		'tierThree',
		'digitalpack',
		'newspaper',
		'weekly',
	]),
	name: z.string(),
});

type OldPromoCampaignModel = z.infer<typeof oldPromoCampaignSchema>;

const productGroupMapping: Record<
	OldPromoCampaignModel['group'],
	z.infer<typeof promoProductSchema>
> = {
	supporterPlus: 'SupporterPlus',
	tierThree: 'TierThree',
	digitalpack: 'DigitalPack',
	newspaper: 'Newspaper',
	weekly: 'Weekly',
};

const transformCampaign = (
	oldCampaign: OldPromoCampaignModel,
): PromoCampaign => ({
	campaignCode: oldCampaign.code,
	product: productGroupMapping[oldCampaign.group],
	name: oldCampaign.name,
	created: new Date().toISOString(),
});

const transformDynamoDbEvent = (
	event: Record<string, AttributeValue>,
): Promise<PromoCampaign> => {
	// Cast here because the type of AttributeValue differs between the dynamodb-stream and client-dynamodb libraries!
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- necessary
	const item = unmarshall(event as Record<string, SDKAttributeValue>);
	const oldCampaign = oldPromoCampaignSchema.safeParse(item);
	if (oldCampaign.success) {
		return Promise.resolve(transformCampaign(oldCampaign.data));
	} else {
		return Promise.reject(oldCampaign.error);
	}
};

export const handleRecord = (
	record: DynamoDBRecord,
	stage: Stage,
): Promise<void> => {
	const tableName = `support-admin-console-promo-campaigns-${stage}`;
	if (
		(record.eventName === 'INSERT' || record.eventName === 'MODIFY') &&
		record.dynamodb?.NewImage
	) {
		return transformDynamoDbEvent(record.dynamodb.NewImage).then((campaign) =>
			writeToDynamoDb(campaign, tableName),
		);
	} else if (record.eventName === 'REMOVE' && record.dynamodb?.OldImage) {
		return transformDynamoDbEvent(record.dynamodb.OldImage).then((campaign) =>
			deleteFromDynamoDb({ campaignCode: campaign.campaignCode }, tableName),
		);
	}

	return Promise.reject(Error(`Invalid event for: ${record.eventName}`));
};

export const handler = async (
	event: DynamoDBStreamEvent,
): Promise<DynamoDBBatchResponse> => {
	const stage = process.env.STAGE;
	if (!(stage === 'CODE' || stage === 'PROD')) {
		throw new Error('Invalid STAGE');
	}

	// We're processing a batch of updates here, so record any failures and have the Lambda return their identifiers
	const batchItemFailures: DynamoDBBatchResponse['batchItemFailures'] = [];

	await Promise.allSettled(
		event.Records.map(async (record) => {
			try {
				console.log('Processing record:', JSON.stringify(record.dynamodb));
				await handleRecord(record, stage);
			} catch (error) {
				console.error(`Failed to process record:`, error);
				if (record.dynamodb?.SequenceNumber) {
					batchItemFailures.push({
						itemIdentifier: record.dynamodb.SequenceNumber,
					});
				}
			}
		}),
	);

	return { batchItemFailures };
};
