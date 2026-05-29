import { logger } from '@modules/logger/logger';
import type { SupporterRatePlanItem } from '@modules/supporter-product-data/supporterProductData';
import type { AddToQueueDependencies } from '../lambdas/addSupporterRatePlanItemToQueueLambda';
import type { AddSupporterRatePlanItemToQueueState } from '../lambdas/types';
import { supporterRatePlanItemFromCsvRow } from '../model/supporterRatePlanItem';

const maxBatchSize = 5;
const timeoutBufferInMillis = maxBatchSize * 5 * 1000;

export type IndexedItem = [SupporterRatePlanItem, number];

function getFirstItemIndex(batch: IndexedItem[]) {
	return batch[0]![1];
}

function getLastItemIndex(batch: IndexedItem[]) {
	return batch[batch.length - 1]![1];
}

const sendItemsToQueue = async (
	items: IndexedItem[],
	dependencies: AddToQueueDependencies,
): Promise<void> => {
	await dependencies.sendMessagesToQueue(items);
	logger.log('Successfully wrote SQS batch', {
		batchSize: items.length,
		firstIndex: getFirstItemIndex(items),
		lastIndex: getLastItemIndex(items),
	});
};

export const addToQueue = async (
	state: AddSupporterRatePlanItemToQueueState,
	getRemainingTimeInMillis: () => number,
	dependencies: AddToQueueDependencies,
): Promise<AddSupporterRatePlanItemToQueueState> => {
	logger.log('Starting to add subscriptions to queue', {
		filename: state.filename,
		recordCount: state.recordCount,
		processedCount: state.processedCount,
		remainingMillis: getRemainingTimeInMillis(),
	});

	let rowIndex = 0;
	let processedCount = state.processedCount;
	let items: IndexedItem[] = [];

	for await (const row of dependencies.streamCsvRows(state.filename)) {
		// Skip rows already processed in a previous invocation
		if (rowIndex < state.processedCount) {
			rowIndex += 1;
			continue;
		}

		// Bail out early if we're running out of time — the step function will
		// re-invoke with the updated processedCount
		if (getRemainingTimeInMillis() < timeoutBufferInMillis) {
			logger.log('Aborting processing due to remaining lambda time', {
				remainingMillis: getRemainingTimeInMillis(),
				timeoutBufferInMillis,
				processedCount,
			});
			break;
		}

		const item: SupporterRatePlanItem = supporterRatePlanItemFromCsvRow(row);
		items.push([item, rowIndex]);

		if (items.length >= maxBatchSize) {
			await sendItemsToQueue(items, dependencies);
			processedCount = getLastItemIndex(items) + 1;
			items = [];
		}

		rowIndex += 1;
	}

	// Flush any remaining items in the last partial batch
	if (items.length > 0) {
		await sendItemsToQueue(items, dependencies);
		processedCount = getLastItemIndex(items) + 1;
	}

	if (rowIndex === 0) {
		throw new Error(`The specified CSV file ${state.filename} was empty`);
	}

	logger.log('Finished writing to SQS', {
		filename: state.filename,
		processedCount,
		recordCount: state.recordCount,
		complete: processedCount === state.recordCount,
	});

	if (processedCount === state.recordCount) {
		logger.log('All records processed, updating lastSuccessfulQueryTime', {
			attemptedQueryTime: state.attemptedQueryTime,
		});
		await dependencies.putLastSuccessfulQueryTime(state.attemptedQueryTime);
	}

	return {
		...state,
		processedCount,
	};
};
