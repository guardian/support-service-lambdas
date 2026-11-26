import { z } from 'zod';
import { logger } from '@modules/logger/logger';
import { type ProductKey } from '@modules/product-catalog/productCatalog';
import { zuoraCatalogToProductKey } from '@modules/product-catalog/zuoraToProductNameMappings';
import { zuoraSubscriptionSchema } from '@modules/zuora/types';
import type { BillingDateMessage } from '../billingDateMessage';
import { classifyNotice } from './classifyNotice';
import { selectLeader } from './selectLeader';

export const reminderSubscriptionSchema = zuoraSubscriptionSchema.extend({
	autoRenew: z.boolean(),
});

export type ReminderSubscription = z.infer<typeof reminderSubscriptionSchema>;

export type ProcessorServices = {
	getSubscription: (
		subscriptionNumber: string,
	) => Promise<ReminderSubscription>;
};

export const inScopeProducts: ProductKey[] = [
	'SupporterPlus',
	'DigitalSubscription',
	'TierThree',
	'GuardianWeeklyDomestic',
	'GuardianWeeklyRestOfWorld',
	'HomeDelivery',
	'NationalDelivery',
	'SubscriptionCard',
	'NewspaperVoucher',
];

// Logged when a callout can't be matched to a leader; an alarm is based on this text
export const leaderNotFoundMessage = 'EMAIL_REMINDER_LEADER_NOT_FOUND';
export const outcomeMessage = 'EMAIL_REMINDER_OUTCOME';

export async function processBillingDate(
	services: ProcessorServices,
	message: BillingDateMessage,
): Promise<void> {
	const subscription = await services.getSubscription(
		message.subscriptionNumber,
	);

	const leader = selectLeader(
		subscription.ratePlans.flatMap((ratePlan) => ratePlan.ratePlanCharges),
		message.chargeNumber,
		message.billingDate,
	);
	if (leader === 'leaderNotFound') {
		logger.error(leaderNotFoundMessage, message);
		return;
	}
	if (leader === 'notLeader') {
		logger.log('not the leader charge, ignoring', message);
		return;
	}

	const classification = classifyNotice(subscription, message.billingDate);
	const productKeys = subscription.ratePlans
		.filter((ratePlan) => ratePlan.lastChangeType !== 'Remove')
		.map((ratePlan) => zuoraCatalogToProductKey[ratePlan.productName])
		.filter((key) => key !== undefined);
	const inScopeProduct = productKeys.some((key) =>
		inScopeProducts.includes(key),
	);
	const eligible =
		subscription.status === 'Active' &&
		subscription.autoRenew &&
		inScopeProduct;

	logger.log(outcomeMessage, {
		...message,
		status: subscription.status,
		autoRenew: subscription.autoRenew,
		productKeys,
		inScopeProduct,
		eligible,
		contractEffectiveDate: subscription.contractEffectiveDate,
		termEndDate: subscription.termEndDate,
		classification,
		wouldSend:
			eligible &&
			classification.status === 'classified' &&
			classification.notice !== 'none'
				? classification.notice
				: undefined,
	});
}
