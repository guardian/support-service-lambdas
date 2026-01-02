import {
	BatchGetItemCommand,
	BatchWriteItemCommand,
	type AttributeValue as DynamoDBAttributeValue,
	DynamoDBClient,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { awsConfig } from '@modules/aws/config';
import { logger } from '@modules/routing/logger';
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

const getString = (attr: AttributeValue | undefined): string | undefined =>
	attr?.S;

const getNumber = (attr: AttributeValue | undefined): number =>
	attr?.N ? parseInt(attr.N, 10) : 0;

const parseDiscount = (
	discount: AttributeValue | undefined,
): { percent: number; months: number } => {
	if (!discount?.M) {
		return { percent: 0, months: 0 };
	}
	return {
		percent: getNumber(discount.M.amount),
		months: getNumber(discount.M.durationMonths),
	};
};

const getViewTableName = (stage: string): string =>
	`MembershipSub-PromoCode-View-${stage}`;

const getCampaignTableName = (stage: string): string =>
	`support-admin-console-promo-campaigns-${stage}`;

const extractCampaignCodes = (records: DynamoDBRecord[]): Set<string> => {
	const campaignCodes = new Set<string>();
	records.forEach((record) => {
		const campaignCode = getString(record.dynamodb?.NewImage?.campaignCode);
		if (campaignCode) {
			campaignCodes.add(campaignCode);
		}
	});
	return campaignCodes;
};

interface PromoViewItem {
	promo_code: string;
	campaign_code: string;
	promotion_name: string;
	campaign_name: string;
	product_family: string;
	promotion_type: string;
	discount_percent: number;
	discount_months: number;
	channel_name: string;
}

type PutRequest = {
	PutRequest: {
		Item: PromoViewItem;
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

	logger.log(`Successfully processed ${eventRecords.length} records.`);
	return putRequestsByPromoCode;
}

export function generatePutRequestFromNewPromoSchema(
	newImage: Record<string, AttributeValue>,
	campaignDetailsByCampaignCode: Record<
		string,
		{ campaign_name: string; product_family: string }
	>,
): { promoCode: string; request: PutRequest } | null {
	const promoCode = getString(newImage.promoCode);
	const campaignCode = getString(newImage.campaignCode);
	const promotionName = getString(newImage.name);

	if (!promoCode || !campaignCode || !promotionName) {
		logger.log(
			'WARNING: Missing required promo fields, skipping record.',
			newImage,
		);
		return null;
	}

	const campaignData = campaignDetailsByCampaignCode[campaignCode];
	if (!campaignData) {
		logger.log(
			`WARNING: Campaign ${campaignCode} not found for promo ${promoCode}`,
		);
		return null;
	}

	const discount = parseDiscount(newImage.discount);

	const item = {
		promo_code: promoCode,
		campaign_code: campaignCode,
		promotion_name: promotionName,
		campaign_name: campaignData.campaign_name,
		product_family: campaignData.product_family,
		promotion_type: discount.percent > 0 ? 'percent_discount' : 'other',
		discount_percent: discount.percent,
		discount_months: discount.months,
		channel_name: '', //What needs to go here?
	};

	return {
		promoCode,
		request: { PutRequest: { Item: item } },
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

	logger.log(
		`Putting records into table: ${getViewTableName(stage)}`,
		JSON.stringify(putRequestsAsArray),
	);

	const RequestItemsObj: Record<
		string,
		Array<{ PutRequest: { Item: Record<string, DynamoDBAttributeValue> } }>
	> = {};
	RequestItemsObj[getViewTableName(stage)] = putRequestsAsArray.map((req) => ({
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
		logger.log(
			`Successfully updated ${putRequestsAsArray.length} promo code views.`,
		);
		return [];
	} catch (err) {
		logger.error('Error writing batch to DynamoDB', err);
		return promoCodes;
	}
}

export async function fetchCampaigns(
	records: DynamoDBRecord[],
	stage: 'CODE' | 'PROD',
): Promise<Record<string, { campaign_name: string; product_family: string }>> {
	const campaignCodes = extractCampaignCodes(records);

	const campaignDetailsByCampaignCode: Record<
		string,
		{ campaign_name: string; product_family: string }
	> = {};

	if (campaignCodes.size === 0) {
		logger.log('No campaign codes found in records');
		return campaignDetailsByCampaignCode;
	}

	const tableName = getCampaignTableName(stage);
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
	logger.log(
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

const createBatchItemFailures = (
	records: DynamoDBRecord[],
	failedPromoCodes?: string[],
): Array<{ itemIdentifier: string }> => {
	let filteredRecords = records;

	if (failedPromoCodes) {
		filteredRecords = records.filter((record) => {
			const promoCode = getString(record.dynamodb?.NewImage?.promoCode);
			return promoCode && failedPromoCodes.includes(promoCode);
		});
	}

	return filteredRecords
		.map((record) => ({
			itemIdentifier: record.dynamodb?.SequenceNumber ?? '',
		}))
		.filter((item) => item.itemIdentifier !== '');
};

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
		logger.log(
			`Successfully updated ${totalUpdated} of ${totalToUpdate} promo code views.`,
		);
		const batchItemFailures = createBatchItemFailures(
			event.Records,
			failedPromoCodes,
		);

		return { batchItemFailures };
	} catch (err) {
		logger.error('Error processing records', err);
		return {
			batchItemFailures: createBatchItemFailures(event.Records),
		};
	}
};
