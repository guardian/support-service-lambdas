import { chunkArray } from '@modules/arrayFunctions';
import { sendBatchMessagesToQueue } from '@modules/aws/sqs';
import { getIfDefined } from '@modules/nullAndUndefined';
import { prettyPrint } from '@modules/prettyPrint';
import { logger } from '@modules/routing/logger';
import { SupporterRatePlanItem } from '@modules/supporter-product-data/supporterProductData';
import { zuoraDateFormat } from '@modules/zuora/utils';
import { parse } from 'csv-parse/sync';
import dayjs from 'dayjs';
import * as fs from 'node:fs';

// This controls which DynamoDB table and SQS queue we write to
const stage = 'PROD';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const syncMobilePurchasesToSupporterProductData = async () => {
	const identityIdAndSubscriptionIdsCsv =
		'/Users/rupert_bates/Downloads/bq-results-20251024-125919-1761310770184.csv';
	const ids = parse(fs.readFileSync(identityIdAndSubscriptionIdsCsv, 'utf-8'), {
		columns: true,
		skip_empty_lines: true,
	});

	console.log(`Parsed ${ids.length} rows`);

	const batchedRows = chunkArray(ids, 10);

	let count = 0;
	for (const batch of batchedRows) {
		const supporterRatePlanItems = batch.map((idRow) =>
			createSupporterRatePlanItem(idRow as Record<string, string>),
		);
		await sendToSupporterProductData(supporterRatePlanItems);
		count += batch.length;
		logger.log(
			`----------------------------
			Processed ${count} of ${ids.length}
			----------------------------`,
		);
		await sleep(50);
	}
};

const createSupporterRatePlanItem = (
	idRow: Record<string, string>,
): SupporterRatePlanItem => {
	const identityId = idRow['user_id'];
	const subscriptionId = idRow['subscription_id'];
	const productId = idRow['product_id'];
	const contractEffectiveDate = idRow['start_timestamp'];
	const termEndDate = idRow['end_timestamp'];
	return {
		identityId: getIfDefined(identityId, 'identityId missing from CSV row'),
		subscriptionName: getIfDefined(
			subscriptionId,
			'subscriptionId missing from CSV row',
		),
		productRatePlanId: 'in_app_purchase',
		productRatePlanName: getIfDefined(
			productId,
			'productRatePlanName missing from CSV row',
		),
		termEndDate: zuoraDateFormat(dayjs(termEndDate)),
		contractEffectiveDate: zuoraDateFormat(dayjs(contractEffectiveDate)),
	};
};

export const sendToSupporterProductData = async (
	supporterRatePlanItems: SupporterRatePlanItem[],
) => {
	const queueName = `supporter-product-data-${stage}`;
	const messages = supporterRatePlanItems.map((item, index) => {
		return {
			id: item.identityId + '-' + index,
			body: prettyPrint(item),
		};
	});

	return await sendBatchMessagesToQueue({
		queueName,
		messages,
	});
};

void (async function () {
	await syncMobilePurchasesToSupporterProductData();
})();
