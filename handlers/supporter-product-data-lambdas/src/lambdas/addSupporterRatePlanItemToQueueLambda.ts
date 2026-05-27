import { putMetric } from '@modules/aws/cloudwatch';
import { sendBatchMessagesToQueue } from '@modules/aws/sqs';
import { logger } from '@modules/logger/logger';
import { stageFromEnvironment } from '@modules/stage';
import type { Context, Handler } from 'aws-lambda';
import type { SupporterRatePlanItem } from '../model/supporterRatePlanItem';
import { supporterRatePlanItemFromCsvRow } from '../model/supporterRatePlanItem';
import { ConfigService } from '../services/configService';
import { parseCsvStreamWithHeader } from '../services/csvService';
import { S3Service } from '../services/s3Service';
import type { AddSupporterRatePlanItemToQueueState } from './types';

const maxBatchSize = 5;
const timeoutBufferInMillis = maxBatchSize * 5 * 1000;

type IndexedItem = [SupporterRatePlanItem, number];

interface AddToQueueDependencies {
	streamCsvRows: (
		filename: string,
	) => AsyncIterable<Record<string, string>> | Iterable<Record<string, string>>;
	sendBatch: (batch: IndexedItem[]) => Promise<void>;
	triggerCsvReadAlarm: () => Promise<void>;
	triggerSqsWriteAlarm: () => Promise<void>;
	putLastSuccessfulQueryTime: (time: string) => Promise<void>;
}

const buildDependencies = (): AddToQueueDependencies => {
	const stage = stageFromEnvironment();
	const s3Service = new S3Service();
	const configService = new ConfigService(stage);

	return {
		streamCsvRows: (filename) =>
			parseCsvStreamWithHeader(s3Service.streamObjectLines(stage, filename)),
		sendBatch: async (batch) => {
			await sendBatchMessagesToQueue({
				queueName: `supporter-product-data-lambdas-${stage}`,
				messages: batch.map(([item, index]) => ({
					id: index.toString(),
					body: JSON.stringify(item),
				})),
			});
		},
		triggerCsvReadAlarm: () =>
			putMetric(
				'CsvReadFailure',
				stage,
				[{ Name: 'Stage', Value: stage }],
				'supporter-product-data',
			),
		triggerSqsWriteAlarm: () =>
			putMetric(
				'SqsWriteFailure',
				stage,
				[{ Name: 'Stage', Value: stage }],
				'supporter-product-data',
			),
		putLastSuccessfulQueryTime: (time) =>
			configService.putLastSuccessfulQueryTime(time),
	};
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
	let seenAnyRow = false;
	let batch: IndexedItem[] = [];

	const flushBatch = async (): Promise<void> => {
		if (batch.length === 0) {
			return;
		}

		if (getRemainingTimeInMillis() < timeoutBufferInMillis) {
			logger.log('Aborting processing due to remaining lambda time', {
				remainingMillis: getRemainingTimeInMillis(),
				timeoutBufferInMillis,
				processedCount,
			});
			// Return without flushing — the step function will re-invoke with the
			// current processedCount so we resume from where we left off
			batch = [];
			return;
		}

		try {
			await dependencies.sendBatch(batch);
			logger.log('Successfully wrote SQS batch', {
				batchSize: batch.length,
				firstIndex: batch[0]?.[1],
				lastIndex: batch[batch.length - 1]?.[1],
			});
		} catch (error) {
			logger.error('Failed to write SQS batch', error);
			await dependencies.triggerSqsWriteAlarm();
		}

		const highestIndex = batch[batch.length - 1]?.[1];
		if (highestIndex !== undefined) {
			processedCount = highestIndex + 1;
		}
		batch = [];
	};

	for await (const row of dependencies.streamCsvRows(state.filename)) {
		seenAnyRow = true;

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
			await flushBatch();
		}

		rowIndex += 1;
	}

	// Flush any remaining items in the last partial batch
	await flushBatch();

	if (!seenAnyRow) {
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

const fromContext =
	(context: Context): (() => number) =>
	() =>
		context.getRemainingTimeInMillis();

export const handler: Handler<
	AddSupporterRatePlanItemToQueueState,
	AddSupporterRatePlanItemToQueueState
> = async (state, context) =>
	addToQueue(state, fromContext(context), buildDependencies());
