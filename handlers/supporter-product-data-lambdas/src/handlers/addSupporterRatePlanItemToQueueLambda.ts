import type { Handler } from 'aws-lambda';
import { sendBatchMessagesToQueue } from '@modules/aws/sqs';
import { Lazy } from '@modules/lazy';
import { stageFromEnvironment } from '@modules/stage';
import { ConfigService } from '../services/configService';
import { parseCsvStreamWithHeader } from '../services/csvService';
import { S3Service } from '../services/s3Service';
import { addToQueue, type AddToQueueDependencies } from './addItemsToQueue';
import type { AddSupporterRatePlanItemToQueueState } from './types';

const buildDependencies = (): AddToQueueDependencies => {
	const stage = stageFromEnvironment();
	const s3Service = new S3Service();
	const configService = new ConfigService(stage);

	return {
		streamCsvRows: (filename) =>
			parseCsvStreamWithHeader(s3Service.streamObjectLines(stage, filename)),
		sendMessagesToQueue: async (items) => {
			await sendBatchMessagesToQueue({
				queueName: `supporter-product-data-${stage}`,
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
