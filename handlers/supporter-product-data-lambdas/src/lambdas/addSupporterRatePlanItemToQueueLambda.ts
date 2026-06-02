import { sendBatchMessagesToQueue } from '@modules/aws/sqs';
import { Lazy } from '@modules/lazy';
import { stageFromEnvironment } from '@modules/stage';
import type { SupporterRatePlanItem } from '@modules/supporter-product-data/supporterProductData';
import type { Handler } from 'aws-lambda';
import { addToQueue } from '../services/addItemsToQueue';
import { ConfigService } from '../services/configService';
import { parseCsvStreamWithHeader } from '../services/csvService';
import { S3Service } from '../services/s3Service';
import type { AddSupporterRatePlanItemToQueueState } from './types';

const stage = stageFromEnvironment();
type IndexedItem = [SupporterRatePlanItem, number];

export type AddToQueueDependencies = {
	streamCsvRows: (
		filename: string,
	) => AsyncIterable<Record<string, string>> | Iterable<Record<string, string>>;
	sendMessagesToQueue: (items: IndexedItem[]) => Promise<void>;
	putLastSuccessfulQueryTime: (time: string) => Promise<void>;
};

const buildDependencies = (): AddToQueueDependencies => {
	const s3Service = new S3Service();
	const configService = new ConfigService(stage);

	return {
		streamCsvRows: (filename) =>
			parseCsvStreamWithHeader(s3Service.streamObjectLines(stage, filename)),
		sendMessagesToQueue: async (items) => {
			await sendBatchMessagesToQueue({
				queueName: `supporter-product-data-lambdas-${stage}`,
				messages: items.map(([item, index]) => ({
					id: index.toString(),
					body: JSON.stringify(item),
				})),
			});
		},
		putLastSuccessfulQueryTime: (time) =>
			configService.putLastSuccessfulQueryTime(time),
	};
};

const lazyDependencies = new Lazy<AddToQueueDependencies>(
	() => Promise.resolve(buildDependencies()),
	'Building dependencies',
);

export const handler: Handler<
	AddSupporterRatePlanItemToQueueState,
	AddSupporterRatePlanItemToQueueState
> = async (state, context) => {
	const dependencies = await lazyDependencies.get();
	return addToQueue(
		state,
		() => context.getRemainingTimeInMillis(),
		dependencies,
	);
};
