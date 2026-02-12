import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { awsConfig } from '@modules/aws/config';
import { logger } from '@modules/routing/logger';
import { sfApiVersion } from '@modules/salesforce/config';
import { SfClient } from '@modules/salesforce/sfClient';
import type { Stage } from '@modules/stage';
import { voidSchema } from '@modules/zuora/types';
import { z } from 'zod';
import type { PromoCodeViewItem } from '../lib/promoCodeViewSchema';
import { promoCodeViewSchema } from '../lib/promoCodeViewSchema';

const dynamoClient = new DynamoDBClient(awsConfig);

const getViewTableName = (stage: Stage): string =>
	`MembershipSub-PromoCode-View-${stage}`;

async function fetchPromoCodes(stage: Stage): Promise<PromoCodeViewItem[]> {
	const tableName = getViewTableName(stage);
	logger.log(`Scanning promo code view table: ${tableName}`);

	const response = await dynamoClient.send(
		new ScanCommand({ TableName: tableName }),
	);

	const items = (response.Items ?? []).map((item) =>
		promoCodeViewSchema.parse(unmarshall(item)),
	);

	logger.log(`Retrieved ${items.length} promo code views`);
	return items;
}

export function generateCSV(items: PromoCodeViewItem[]): string {
	const sfFieldNames = [
		'Name',
		'Promotion_Name__c',
		'Campaign_Name__c',
		'Channel_Name__c',
		'Product_Family__c',
		'Promotion_Type__c',
		'Discount_Percent__c',
		'Discount_Months__c',
	];

	const fieldsToExport: Array<keyof PromoCodeViewItem> = [
		'promo_code',
		'promotion_name',
		'campaign_name',
		'channel_name',
		'product_family',
		'promotion_type',
		'discount_percent',
		'discount_months',
	];

	const enquote = (values: Array<string | number>): string =>
		`"${values.join('","')}"`;

	const rows = [
		enquote(sfFieldNames),
		...items.map((item) => enquote(fieldsToExport.map((field) => item[field]))),
	];

	return rows.join('\n');
}

const bulkJobSchema = z.object({
	id: z.string(),
	state: z.string(),
	errorMessage: z.string().optional(),
});
type BulkJobResponse = z.infer<typeof bulkJobSchema>;

// https://developer.salesforce.com/docs/atlas.en-us.api_asynch.meta/api_asynch/create_job.htm
async function createBulkJob(sfClient: SfClient): Promise<string> {
	const response: BulkJobResponse = await sfClient.post(
		`/services/data/${sfApiVersion()}/jobs/ingest`,
		JSON.stringify({
			externalIdFieldName: 'Name',
			object: 'Promotion_Code__c',
			operation: 'upsert',
		}),
		bulkJobSchema,
	);

	logger.log(`Created bulk job with ID: ${response.id}`);
	return response.id;
}

async function uploadBulkData(
	sfClient: SfClient,
	jobId: string,
	csvData: string,
): Promise<void> {
	await sfClient.put(
		`/services/data/${sfApiVersion()}/jobs/ingest/${jobId}/batches`,
		csvData,
		voidSchema,
		{ 'Content-Type': 'text/csv' },
	);

	logger.log(`Uploaded data to job ${jobId}`);
}

async function closeBulkJob(sfClient: SfClient, jobId: string): Promise<void> {
	const response: BulkJobResponse = await sfClient.patch(
		`/services/data/${sfApiVersion()}/jobs/ingest/${jobId}`,
		JSON.stringify({ state: 'UploadComplete' }),
		bulkJobSchema,
	);

	if (response.state !== 'UploadComplete') {
		throw new Error(`Job state is not UploadComplete: ${response.state}`);
	}

	logger.log(`Closed job ${jobId}`);
}

const POLL_INTERVAL_IN_MS = 1000;
const MAX_POLL_ATTEMPTS = 60;

async function waitForBulkJobCompletion(
	sfClient: SfClient,
	jobId: string,
): Promise<void> {
	for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
		const data: BulkJobResponse = await sfClient.get(
			`/services/data/${sfApiVersion()}/jobs/ingest/${jobId}`,
			bulkJobSchema,
		);

		if (data.state === 'JobComplete') {
			logger.log(`Job ${jobId} completed successfully`);
			return;
		}

		if (data.state === 'Failed') {
			throw new Error(`Job failed: ${data.errorMessage}`);
		}

		await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_IN_MS));
	}

	throw new Error(`Job ${jobId} did not complete within timeout`);
}

async function deleteBulkJob(sfClient: SfClient, jobId: string): Promise<void> {
	await sfClient.delete(
		`/services/data/${sfApiVersion()}/jobs/ingest/${jobId}`,
		voidSchema,
	);
	logger.log(`Deleted job ${jobId}`);
}

async function exportToSalesforce(
	sfClient: SfClient,
	csvData: string,
): Promise<void> {
	const jobId = await createBulkJob(sfClient);
	await uploadBulkData(sfClient, jobId, csvData);
	await closeBulkJob(sfClient, jobId);
	await waitForBulkJobCompletion(sfClient, jobId);
	await deleteBulkJob(sfClient, jobId);

	logger.log('Successfully exported promo codes to Salesforce');
}

export const handler = async (): Promise<string> => {
	const stage = process.env.STAGE;
	if (!(stage === 'CODE' || stage === 'PROD')) {
		throw new Error('Invalid STAGE');
	}

	try {
		const sfClient = await SfClient.create(stage);
		const items = await fetchPromoCodes(stage);
		const csvData = generateCSV(items);

		await exportToSalesforce(sfClient, csvData);

		return `Successfully updated Salesforce Promotion Codes`;
	} catch (err) {
		logger.error('Error exporting to Salesforce', err);
		throw err;
	}
};
