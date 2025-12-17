import type { AttributeValue as SDKAttributeValue } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import type {
	PromoCampaign,
	promoProductSchema,
} from '@modules/promotions/v2/schema';
import type { DynamoDBRecord, DynamoDBStreamEvent } from 'aws-lambda';
import type { AttributeValue } from 'aws-lambda/trigger/dynamodb-stream';
import { z } from 'zod';

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

export const transformDynamoDbEvent = (
	event: Record<string, AttributeValue>,
): PromoCampaign | Error => {
	// Cast here because the type of AttributeValue differs between the dynamodb-stream and client-dynamodb libraries!
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- necessary
	const item = unmarshall(event as Record<string, SDKAttributeValue>);
	const oldCampaign = oldPromoCampaignSchema.safeParse(item);
	if (oldCampaign.success) {
		return transformCampaign(oldCampaign.data);
	} else {
		return oldCampaign.error;
	}
};

export const handleRecord = (record: DynamoDBRecord): void => {
	if (record.eventName === 'INSERT' || record.eventName === 'MODIFY') {
		if (record.dynamodb?.NewImage) {
			const campaign = transformDynamoDbEvent(record.dynamodb.NewImage);
			console.log(`${record.eventName} campaign:`, JSON.stringify(campaign));
			// TODO - write to dynamodb
		}
	} else if (record.eventName === 'REMOVE') {
		if (record.dynamodb?.OldImage) {
			const campaign = transformDynamoDbEvent(record.dynamodb.OldImage);
			console.log(`${record.eventName} campaign:`, JSON.stringify(campaign));
			// TODO - delete from dynamodb
		}
	}
};

export const handler = (event: DynamoDBStreamEvent): Promise<void> => {
	event.Records.map((record) => {
		console.log('Processing record:', JSON.stringify(record.dynamodb));
		handleRecord(record);
	});
	return Promise.resolve();
};
