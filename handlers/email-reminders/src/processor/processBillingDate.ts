import { z } from 'zod';
import { logger } from '@modules/logger/logger';
import { type ProductKey } from '@modules/product-catalog/productCatalog';
import { zuoraCatalogToProductKey } from '@modules/product-catalog/zuoraToProductNameMappings';
import { zuoraSubscriptionSchema } from '@modules/zuora/types';
import type { ProcessorInput } from '../stepData';
import { classifyNotice } from './classifyNotice';

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

// Logged when no charge bills on the date any more, i.e. the subscription changed after the query; an alarm is based on this text
export const chargeNotBillingMessage = 'EMAIL_REMINDER_CHARGE_NOT_BILLING';
export const outcomeMessage = 'EMAIL_REMINDER_OUTCOME';

export function processBillingDate(
	subscription: ReminderSubscription,
	message: ProcessorInput,
): void {
	const billsOnDate = subscription.ratePlans
		.flatMap((ratePlan) => ratePlan.ratePlanCharges)
		.some(
			(charge) =>
				charge.chargedThroughDate?.toISOString().slice(0, 10) ===
				message.billingDate,
		);
	if (!billsOnDate) {
		logger.error(chargeNotBillingMessage, message);
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
