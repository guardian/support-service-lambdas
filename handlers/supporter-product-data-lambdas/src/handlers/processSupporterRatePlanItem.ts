import { logger } from '@modules/logger/logger';
import type { SupporterRatePlanItem } from '@modules/supporter-product-data/supporterProductData';
import { supporterRatePlanItemSchema } from '@modules/supporter-product-data/supporterProductData';
import type { SQSRecord } from 'aws-lambda';
import { addContributionAmountIfNeeded } from '../services/contributions';
import type { MinimalZuoraSubscription } from '../services/zuoraSubscriptionService';

export type ProcessItemDependencies = {
	isDiscountRatePlanItem: (item: SupporterRatePlanItem) => boolean;
	contributionIds: string[];
	getSubscription: (
		subscriptionName: string,
	) => Promise<MinimalZuoraSubscription>;
	writeItem: (item: SupporterRatePlanItem) => Promise<void>;
};

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
