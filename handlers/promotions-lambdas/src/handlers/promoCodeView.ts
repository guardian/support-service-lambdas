import {
	BatchGetItemCommand,
	BatchWriteItemCommand,
	DynamoDBClient,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { awsConfig } from '@modules/aws/config';
import { promoCampaignSchema } from '@modules/promotions/v2/schema';
import { logger } from '@modules/routing/logger';
import type {
	AttributeValue,
	DynamoDBBatchResponse,
	DynamoDBRecord,
	DynamoDBStreamEvent,
} from 'aws-lambda';
import type { PromoCodeViewItem } from '../lib/promoCodeViewSchema';

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

type PutRequest = {
	PutRequest: {
		Item: PromoCodeViewItem;
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
		promotion_type: 'percent_discount',
		discount_percent: discount.percent,
		discount_months: discount.months,
		channel_name: '',
	};

	return {
		promoCode,
		request: { PutRequest: { Item: item } },
	};
}

export async function writePromoCodeViews(
	stage: 'CODE' | 'PROD',
	putRequestsByPromoCode: Record<string, PutRequest>,
): Promise<string[]> {
	const putRequests = Object.values(putRequestsByPromoCode);

	if (putRequests.length === 0) {
		logger.log('No records to write');
		return [];
	}

	logger.log(
		`Writing ${putRequests.length} records to table: ${getViewTableName(stage)}`,
	);

	const tableName = getViewTableName(stage);
	const requestItems = putRequests.map((req) => ({
		PutRequest: {
			Item: marshall(req.PutRequest.Item),
		},
	}));

	try {
		await dynamoClient.send(
			new BatchWriteItemCommand({
				RequestItems: {
					[tableName]: requestItems,
				},
			}),
		);
		logger.log(
			`Successfully wrote ${putRequests.length} promo code views with codes: ${Object.keys(putRequestsByPromoCode).join(', ')}`,
		);
		return [];
	} catch (err) {
		logger.error('Error writing to DynamoDB', err);
		return Object.keys(putRequestsByPromoCode);
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
		promoCampaignSchema.parse(unmarshall(item)),
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
		const failedPromoCodes = await writePromoCodeViews(
			stage,
			putRequestsByPromoCode,
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
