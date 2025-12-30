import {
	BatchGetItemCommand,
	BatchWriteItemCommand,
	type AttributeValue as DynamoDBAttributeValue,
	DynamoDBClient,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { awsConfig } from '@modules/aws/config';
import type {
	AttributeValue,
	DynamoDBBatchResponse,
	DynamoDBRecord,
	DynamoDBStreamEvent,
} from 'aws-lambda';
import { z } from 'zod';

const campaignSchema = z.object({
	campaignCode: z.string(),
	name: z.string(),
	product: z.string(),
});

type PutRequest = {
	PutRequest: {
		Item: {
			promo_code: string;
			campaign_code: string;
			promotion_name: string;
			campaign_name: string;
			product_family: string;
			promotion_type: string;
			discount_percent: number;
			discount_months: number;
			channel_name: string;
		};
	};
};

const dynamoClient = new DynamoDBClient(awsConfig);

export function handleEventRecords(
	eventRecords: DynamoDBRecord[],
	campaignDetailsByCampaignCode: Record<
		string,
		{ campaign_name: string; product_family: string }
	>,
): Record<string, PutRequest> {
	const putRequestsByPromoCode = eventRecords.reduce<
		Record<string, PutRequest>
	>((acc, record) => {
		if (!record.dynamodb?.NewImage) {
			return acc;
		}
		const result = generatePutRequestFromNewPromoSchema(
			record.dynamodb.NewImage,
			campaignDetailsByCampaignCode,
		);
		if (result) {
			acc[result.promoCode] = result.request;
		}
		return acc;
	}, {});

	console.log(`Successfully processed ${eventRecords.length} records.`);
	return putRequestsByPromoCode;
}

export function generatePutRequestFromNewPromoSchema(
	newImage: Record<string, AttributeValue>,
	campaignDetailsByCampaignCode: Record<
		string,
		{ campaign_name: string; product_family: string }
	>,
): { promoCode: string; request: PutRequest } | null {
	if (
		!newImage.promoCode?.S ||
		!newImage.campaignCode?.S ||
		!newImage.name?.S
	) {
		console.warn('Missing required promo fields, skipping record.', newImage);
		return null;
	}

	const promoCode = newImage.promoCode.S;
	const campaignCode = newImage.campaignCode.S;
	const promotionName = newImage.name.S;

	const campaignData = campaignDetailsByCampaignCode[campaignCode];
	if (!campaignData) {
		console.warn(`Campaign ${campaignCode} not found for promo ${promoCode}`);
		return null;
	}
	let discountPercent = 0;
	let discountDurationMonths = 0;
	if (newImage.discount?.M) {
		discountPercent = newImage.discount.M.amount?.N
			? parseInt(newImage.discount.M.amount.N, 10)
			: 0;
		discountDurationMonths = newImage.discount.M.durationMonths?.N
			? parseInt(newImage.discount.M.durationMonths.N, 10)
			: 0;
	}

	return {
		promoCode,
		request: {
			PutRequest: {
				Item: {
					promo_code: promoCode,
					campaign_code: campaignCode,
					promotion_name: promotionName,
					campaign_name: campaignData.campaign_name,
					product_family: campaignData.product_family,
					promotion_type: discountPercent > 0 ? 'percent_discount' : 'other',
					discount_percent: discountPercent,
					discount_months: discountDurationMonths,
					channel_name: 'What needs to go here?',
				},
			},
		},
	};
}

export async function chunkedUpdateOfPromoCodes(
	stage: 'CODE' | 'PROD',
	putRequestsByPromoCode: Record<string, PutRequest>,
): Promise<string[]> {
	const chunk = 25;
	const promoCodesToUpdate = Object.keys(putRequestsByPromoCode);

	const promises: Array<Promise<string[]>> = [];
	for (let i = 0; i < promoCodesToUpdate.length; i += chunk) {
		const temparray = promoCodesToUpdate.slice(i, i + chunk);
		if (temparray.length === 0) {
			continue;
		}
		promises.push(
			batchWriteRequestsForCodes(temparray, stage, putRequestsByPromoCode),
		);
	}

	return Promise.all(promises).then((results) => results.flat());
}

export async function batchWriteRequestsForCodes(
	promoCodes: string[],
	stage: 'CODE' | 'PROD',
	putRequestsByPromoCode: Record<string, PutRequest>,
): Promise<string[]> {
	const putRequestsAsArray: PutRequest[] = [];

	promoCodes.forEach((key) => {
		const putRequest = putRequestsByPromoCode[key];
		if (putRequest) {
			putRequestsAsArray.push(putRequest);
		}
	});

	console.log(
		`Putting records into table: MembershipSub-PromoCode-View-${stage} = `,
		JSON.stringify(putRequestsAsArray),
	);

	const RequestItemsObj: Record<
		string,
		Array<{ PutRequest: { Item: Record<string, DynamoDBAttributeValue> } }>
	> = {};
	RequestItemsObj['MembershipSub-PromoCode-View-' + stage] =
		putRequestsAsArray.map((req) => ({
			PutRequest: {
				Item: marshall(req.PutRequest.Item),
			},
		}));

	try {
		await dynamoClient.send(
			new BatchWriteItemCommand({
				RequestItems: RequestItemsObj,
			}),
		);
		console.log(
			`Successfully updated ${putRequestsAsArray.length} promo code views.`,
		);
		return [];
	} catch (err) {
		console.error('Error writing batch to DynamoDB', err);
		return promoCodes;
	}
}

export async function fetchCampaigns(
	records: DynamoDBRecord[],
	stage: 'CODE' | 'PROD',
): Promise<Record<string, { campaign_name: string; product_family: string }>> {
	const campaignCodes = new Set<string>();
	records.forEach((record) => {
		const campaignCode = record.dynamodb?.NewImage?.campaignCode?.S;
		if (campaignCode) {
			campaignCodes.add(campaignCode);
		}
	});

	const campaignDetailsByCampaignCode: Record<
		string,
		{ campaign_name: string; product_family: string }
	> = {};

	if (campaignCodes.size === 0) {
		console.log('No campaign codes found in records');
		return campaignDetailsByCampaignCode;
	}

	const tableName = `support-admin-console-promo-campaigns-${stage}`;
	const keys = Array.from(campaignCodes).map((code) => ({
		campaignCode: { S: code },
	}));

	const data = await dynamoClient.send(
		new BatchGetItemCommand({
			RequestItems: {
				[tableName]: {
					Keys: keys,
				},
			},
		}),
	);

	const items = (data.Responses?.[tableName] ?? []).map((item) =>
		campaignSchema.parse(unmarshall(item)),
	);
	console.log(
		`Retrieved ${items.length} of ${campaignCodes.size} campaigns for stage ${stage}`,
	);

	items.forEach((campaign) => {
		campaignDetailsByCampaignCode[campaign.campaignCode] = {
			campaign_name: campaign.name,
			product_family: campaign.product,
		};
	});

	return campaignDetailsByCampaignCode;
}

export const handler = async (
	event: DynamoDBStreamEvent,
): Promise<DynamoDBBatchResponse> => {
	const stage = process.env.STAGE;
	if (!(stage === 'CODE' || stage === 'PROD')) {
		throw new Error('Invalid STAGE');
	}

	try {
		const campaignDetailsByCampaignCode = await fetchCampaigns(
			event.Records,
			stage,
		);
		const putRequestsByPromoCode = handleEventRecords(
			event.Records,
			campaignDetailsByCampaignCode,
		);
		const failedPromoCodes = await chunkedUpdateOfPromoCodes(
			stage,
			putRequestsByPromoCode,
		);

		const totalToUpdate = Object.keys(putRequestsByPromoCode).length;

		const totalUpdated = totalToUpdate - failedPromoCodes.length;
		console.log(
			`Successfully updated ${totalUpdated} of ${totalToUpdate} promo code views.`,
		);
		const batchItemFailures = event.Records.filter((record) => {
			const promoCode = record.dynamodb?.NewImage?.promoCode?.S;
			return promoCode && failedPromoCodes.includes(promoCode);
		})
			.map((record) => ({
				itemIdentifier: record.dynamodb?.SequenceNumber ?? '',
			}))
			.filter((item) => item.itemIdentifier !== '');

		return { batchItemFailures };
	} catch (err) {
		console.error('Error processing records', err);
		return {
			batchItemFailures: event.Records.map((record) => ({
				itemIdentifier: record.dynamodb?.SequenceNumber ?? '',
			})).filter((item) => item.itemIdentifier !== ''),
		};
	}
};
