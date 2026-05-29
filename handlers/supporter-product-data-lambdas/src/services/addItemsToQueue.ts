import { logger } from '@modules/logger/logger';
import type { AddToQueueDependencies } from '../lambdas/addSupporterRatePlanItemToQueueLambda';
import type { AddSupporterRatePlanItemToQueueState } from '../lambdas/types';
import type { SupporterRatePlanItem } from '../model/supporterRatePlanItem';
import { supporterRatePlanItemFromCsvRow } from '../model/supporterRatePlanItem';

const maxBatchSize = 5;
const timeoutBufferInMillis = maxBatchSize * 5 * 1000;

export type IndexedItem = [SupporterRatePlanItem, number];

const flushBatch = async (
	batch: IndexedItem[],
	getRemainingTimeInMillis: () => number,
	dependencies: AddToQueueDependencies,
): Promise<number> => {
	if (getRemainingTimeInMillis() < timeoutBufferInMillis) {
		logger.log('Aborting processing due to remaining lambda time', {
			remainingMillis: getRemainingTimeInMillis(),
			timeoutBufferInMillis,
		});
		// Return without flushing — the step function will re-invoke with the
		// current processedCount so we resume from where we left off
		return batch[0]![1];
	}

	try {
		await dependencies.sendBatch(batch);
		logger.log('Successfully wrote SQS batch', {
			batchSize: batch.length,
			firstIndex: batch[0]![1],
			lastIndex: batch[batch.length - 1]![1],
		});
	} catch (error) {
		logger.error('Failed to write SQS batch', error);
		await dependencies.triggerSqsWriteAlarm();
	}

	return batch[batch.length - 1]![1] + 1;
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
	let batch: IndexedItem[] = [];

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

		let item: SupporterRatePlanItem;
		try {
			item = supporterRatePlanItemFromCsvRow(row, rowIndex + 2);
		} catch (error) {
			logger.log('Failed to decode CSV row', { rowIndex, error });
			await dependencies.triggerCsvReadAlarm();
			throw new Error(
				`Failed to decode CSV row at index ${rowIndex} in file ${
					state.filename
				}: ${String(error)}`,
			);
		}

		batch.push([item, rowIndex]);

		if (batch.length >= maxBatchSize) {
			processedCount = await flushBatch(batch, getRemainingTimeInMillis, dependencies);
			batch = [];
		}

		rowIndex += 1;
	}

	// Flush any remaining items in the last partial batch
	if (batch.length > 0) {
		processedCount = await flushBatch(batch, getRemainingTimeInMillis, dependencies);
	}

	if (rowIndex === 0) {
		await dependencies.triggerCsvReadAlarm();
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
