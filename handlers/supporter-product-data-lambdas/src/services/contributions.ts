import { logger } from '@modules/logger/logger';
import { getIfDefined } from '@modules/nullAndUndefined';
import type { SupporterRatePlanItem } from '@modules/supporter-product-data/supporterProductData';
import type { ProcessItemDependencies } from '../handlers/processSupporterRatePlanItem';
import type { MinimalZuoraSubscription } from './zuoraSubscriptionService';

export const contributionAmountFromZuoraSubscription = (
	subscription: MinimalZuoraSubscription,
	contributionIds: string[],
) => {
	const contributionRatePlan = subscription.ratePlans.find((ratePlan) =>
		contributionIds.includes(ratePlan.productRatePlanId),
	);

	const firstCharge = getIfDefined(
		contributionRatePlan?.ratePlanCharges[0],
		`No charge on contribution rate plan for subscription ${subscription.subscriptionNumber}`,
	);

	return {
		amount: getIfDefined(
			firstCharge.price,
			`No price on contribution rate plan for subscription ${subscription.subscriptionNumber}`,
		),
		currency: firstCharge.currency,
	};
};

/**
 * If the provided supporter rate plan item is a contribution, fetch the contribution
 * amount from Zuora
 * @param item
 * @param dependencies
 */
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

	logger.log('Resolved contribution amount', contributionAmount);
	return {
		...item,
		contributionAmount: contributionAmount.amount,
		contributionCurrency: contributionAmount.currency,
	};
};
