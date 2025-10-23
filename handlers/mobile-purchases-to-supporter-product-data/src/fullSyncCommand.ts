import {
	BatchWriteItemCommand,
	DynamoDBClient,
} from '@aws-sdk/client-dynamodb';
import { logger } from '@modules/routing/logger';
import { SupporterRatePlanItem } from '@modules/supporter-product-data/supporterProductData';
import { parse } from 'csv-parse/sync';
import * as fs from 'node:fs';
import { getConfig } from './config';
import { updateFromIds } from './index';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const syncMobilePurchasesToSupporterProductData = async () => {
	// CSV with columns user_id and subscription_id
	const identityIdAndSubscriptionIdsCsv =
		'/Users/rupert_bates/Downloads/bq-results-20251022-133858-1761140418036.csv';
	const ids = parse(fs.readFileSync(identityIdAndSubscriptionIdsCsv, 'utf-8'), {
		columns: true,
		skip_empty_lines: true,
	});
	console.log(`Parsed ${ids.length} rows`);
	const config = await getConfig({
		stage: 'PROD',
		stack: 'support',
		app: 'mobile-purchases-to-supporter-product-data',
	});
	let count = 0;
	for (const idRow of ids) {
		const identityId = idRow['user_id'];
		const subscriptionId = idRow['subscription_id'];
		const productId = idRow['product_id'];
		const contractEffectiveDate = idRow['start_timestamp'];
		const termEndDate = idRow['end_timestamp'];
		const supporterProductDataItem: SupporterRatePlanItem = {
			identityId: identityId,
			subscriptionName: subscriptionId,
			productRatePlanId: 'in_app_purchase',
			productRatePlanName: productId,
			termEndDate: termEndDate,
			contractEffectiveDate: contractEffectiveDate,
		};
		console.log(
			`Processing identityId=${identityId} subscriptionId=${subscriptionId} productId=${productId}`,
		);
		await updateFromIds('PROD', config, identityId, subscriptionId);
		logger.log(
			`\n----------------------------\nProcessed ${++count} of ${ids.length}\n----------------------------`,
		);
		await sleep(50);
	}
};

const writeBatchToDynamo = async () => {
	const resp = await new DynamoDBClient({}).send(
		new BatchWriteItemCommand({ RequestItems: requestItems }),
	);

	logger.log(
		'info',
		`Received BatchWriteItem response batchIndex=${bIndex} attempt=${attempt} body=${JSON.stringify(resp)}`,
	);
};

void (async function () {
	await syncMobilePurchasesToSupporterProductData();
})();
