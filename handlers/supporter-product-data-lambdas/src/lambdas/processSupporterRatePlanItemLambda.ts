import { Lazy } from '@modules/lazy';
import { logger } from '@modules/logger/logger';
import { stageFromEnvironment } from '@modules/stage';
import type { SupporterRatePlanItem } from '@modules/supporter-product-data/supporterProductData';
import { supporterRatePlanItemSchema } from '@modules/supporter-product-data/supporterProductData';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { getZuoraCatalogFromS3 } from '@modules/zuora-catalog/S3';
import type { Handler, SQSEvent, SQSRecord } from 'aws-lambda';
import {
	addContributionAmountIfNeeded,
	contributionIdsForStage,
} from '../services/contributions';
import {
	getDiscountProductRatePlanIds,
	isDiscountProductRatePlanItem,
} from '../services/discounts';
import { DynamoService } from '../services/dynamoService';
import {
	type MinimalZuoraSubscription,
	ZuoraSubscriptionService,
} from '../services/zuoraSubscriptionService';

export type ProcessItemDependencies = {
	isDiscountRatePlanItem: (item: SupporterRatePlanItem) => boolean;
	contributionIds: string[];
	getSubscription: (
		subscriptionName: string,
	) => Promise<MinimalZuoraSubscription>;
	writeItem: (item: SupporterRatePlanItem) => Promise<void>;
};

const buildDependencies = async (): Promise<ProcessItemDependencies> => {
	const stage = stageFromEnvironment();

	const zuoraClient = await ZuoraClient.create(stage);
	const subscriptionService = new ZuoraSubscriptionService(zuoraClient);
	const dynamoService = new DynamoService(stage);

	const zuoraCatalog = await getZuoraCatalogFromS3(stage);
	const discountIds = getDiscountProductRatePlanIds(zuoraCatalog);

	return {
		isDiscountRatePlanItem: (item: SupporterRatePlanItem) =>
			isDiscountProductRatePlanItem(discountIds, item),
		contributionIds: contributionIdsForStage(stage),
		getSubscription: (subscriptionName) =>
			subscriptionService.getSubscription(subscriptionName),
		writeItem: (item) => dynamoService.writeItem(item),
	};
};

const lazyDependencies = new Lazy<ProcessItemDependencies>(
	buildDependencies,
	'Building dependencies',
);

export const processItem = async (
	item: SupporterRatePlanItem,
	dependencies: ProcessItemDependencies,
): Promise<void> => {
	logger.resetContext();
	logger.mutableAddContext(item.subscriptionName);
	logger.log('Processing supporter rate plan item', item);

	if (dependencies.isDiscountRatePlanItem(item)) {
		logger.log('Supporter rate plan item is a discount and will be skipped');
		return;
	}

	const itemWithContribution = await addContributionAmountIfNeeded(
		item,
		dependencies,
	);

	await dependencies.writeItem(itemWithContribution);
};

export const processEvent = async (
	records: SQSRecord[],
	dependencies: ProcessItemDependencies,
): Promise<void> => {
	logger.log('Processing SQS event', { recordCount: records.length });
	await Promise.all(
		records.map(async (record) => {
			const item = supporterRatePlanItemSchema.parse(JSON.parse(record.body));
			await processItem(item, dependencies);
		}),
	);
	logger.log('Finished processing SQS event', {
		recordCount: records.length,
	});
};

export const handler: Handler<SQSEvent, void> = async (event) => {
	const dependencies = await lazyDependencies.get();
	return await processEvent(event.Records, dependencies);
};
