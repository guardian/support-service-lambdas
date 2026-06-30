import { logger } from '@modules/logger/logger';
import type { SecondaryUserRecord } from '@modules/multiple-account/secondaryUserRepository';
import { secondaryUserTTLFromPrimarySubscriptionTTL } from '@modules/multiple-account/secondaryUserRepository';
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
	writePrimaryItem: (item: SupporterRatePlanItem) => Promise<void>;
	getSecondaryUsers: (
		subscriptionName: string,
	) => Promise<SecondaryUserRecord[]>;
	writeSecondaryItem: (
		primaryItem: SupporterRatePlanItem,
		secondaryUser: SecondaryUserRecord,
	) => Promise<void>;
	updateSecondaryUserTTL: (
		primarySubscriptionName: string,
		secondaryIdentityId: string,
		newTTL: number,
	) => Promise<void>;
};

export const processItem = async (
	item: SupporterRatePlanItem,
	dependencies: ProcessItemDependencies,
): Promise<void> => {
	logger.log('Processing supporter rate plan item', item);

	if (dependencies.isDiscountRatePlanItem(item)) {
		logger.log('Supporter rate plan item is a discount and will be skipped');
		return;
	}

	const itemWithContribution = await addContributionAmountIfNeeded(
		item,
		dependencies,
	);

	await dependencies.writePrimaryItem(itemWithContribution);

	const secondaryUsers = await dependencies.getSecondaryUsers(
		item.subscriptionName,
	);
	if (secondaryUsers.length > 0) {
		logger.log(`Updating ${secondaryUsers.length} secondary subscription(s)`, {
			subscriptionName: item.subscriptionName,
		});
		await Promise.all(
			secondaryUsers.map(async (secondaryUser) => {
				await dependencies.writeSecondaryItem(
					itemWithContribution,
					secondaryUser,
				);
				await dependencies.updateSecondaryUserTTL(
					itemWithContribution.subscriptionName,
					secondaryUser.secondaryIdentityId,
					secondaryUserTTLFromPrimarySubscriptionTTL(
						itemWithContribution.termEndDate,
					),
				);
			}),
		);
	}
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
