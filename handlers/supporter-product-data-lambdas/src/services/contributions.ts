import { logger } from '@modules/logger/logger';
import type { Stage } from '@modules/stage';
import type { SupporterRatePlanItem } from '@modules/supporter-product-data/supporterProductData';
import type { ProcessItemDependencies } from './processSupporterRatePlanItem';
import type { MinimalZuoraSubscription } from './zuoraSubscriptionService';

export const contributionIdsForStage = (stage: Stage): string[] =>
	stage === 'PROD'
		? ['2c92a0fc5aacfadd015ad24db4ff5e97', '2c92a0fc5e1dc084015e37f58c200eea']
		: ['2c92c0f85a6b134e015a7fcd9f0c7855', '2c92c0f85e2d19af015e3896e824092c'];

export const contributionAmountFromZuoraSubscription = (
	subscription: MinimalZuoraSubscription,
	contributionIds: string[],
) => {
	const contributionRatePlan = subscription.ratePlans.find((ratePlan) =>
		contributionIds.includes(ratePlan.id),
	);
	const firstCharge = contributionRatePlan?.ratePlanCharges[0];
	if (firstCharge?.price === undefined) {
		return undefined;
	}

	return {
		amount: firstCharge.price,
		currency: firstCharge.currency,
	};
};

export const addContributionAmountIfNeeded = async (
	item: SupporterRatePlanItem,
	dependencies: Pick<
		ProcessItemDependencies,
		'contributionIds' | 'getSubscription'
	>,
): Promise<SupporterRatePlanItem> => {
	if (!dependencies.contributionIds.includes(item.productRatePlanId)) {
		return item;
	}

	const subscription = await dependencies.getSubscription(
		item.subscriptionName,
	);
	const contributionAmount = contributionAmountFromZuoraSubscription(
		subscription,
		dependencies.contributionIds,
	);

	logger.log('Resolved contribution amount');
	return {
		...item,
		contributionAmount,
	};
};
