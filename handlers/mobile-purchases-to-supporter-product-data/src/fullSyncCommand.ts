import * as fs from 'node:fs';
import { chunkArray } from '@modules/arrayFunctions';
import { sendBatchMessagesToQueue } from '@modules/aws/sqs';
import { getIfDefined } from '@modules/nullAndUndefined';
import { prettyPrint } from '@modules/prettyPrint';
import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';
import type { SupporterRatePlanItem } from '@modules/supporter-product-data/supporterProductData';
import { parse } from 'csv-parse/sync';
import dayjs from 'dayjs';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const syncMobilePurchasesToSupporterProductData = async (
	stage: Stage,
	csvFile: string,
) => {
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- todo switch to zod or a type safe cvs lib
	const ids = parse(fs.readFileSync(csvFile, 'utf-8'), {
		columns: true,
		skip_empty_lines: true,
	}) as Array<Record<string, string>>;

	console.log(`Parsed ${ids.length} rows`);

	const batchedRows = chunkArray(ids, 10);

	let count = 0;
	for (const batch of batchedRows) {
		const supporterRatePlanItems = batch.map((idRow) =>
			createSupporterRatePlanItem(idRow),
		);
		await sendToSupporterProductData(stage, supporterRatePlanItems);
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
		termEndDate: dayjs(termEndDate),
		contractEffectiveDate: dayjs(contractEffectiveDate),
	};
};

export const sendToSupporterProductData = async (
	stage: Stage,
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
	const stage = process.argv[2];
	if (stage !== 'CODE' && stage !== 'PROD') {
		console.log(
			'Please provide a valid stage. This will control which Dynamo table and SQS queue are used. Valid options are CODE and PROD',
		);
		return;
	}
	const csvFile = process.argv[3];
	if (!csvFile) {
		console.log(
			'Please provide an absolute path to a CSV file containing the records to sync',
		);
		return;
	}
	await syncMobilePurchasesToSupporterProductData(stage, csvFile);
})();
