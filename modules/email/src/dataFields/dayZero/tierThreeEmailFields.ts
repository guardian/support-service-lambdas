import type { CurrencyCode } from '@modules/internationalisation/currency';
import type { ProductPurchase } from '@modules/product-catalog/productPurchaseSchema';
import type { Dayjs } from 'dayjs';
import type { EmailMessageWithIdentityUserId } from '@modules/email/email';
import { DataExtensionNames } from '@modules/email/email';
import { buildDeliveryEmailFields } from './deliveryEmailFields';
import { buildEmailFields } from './emailFields';
import type {
	EmailBillingPeriod,
	EmailPaymentMethod,
	EmailPaymentSchedule,
	EmailUser,
} from './types';

export type TierThreeProductPurchase = Extract<
	ProductPurchase,
	{ product: 'TierThree' }
>;

export function buildTierThreeEmailFields({
	today,
	user,
	currency,
	billingPeriod,
	subscriptionNumber,
	paymentSchedule,
	paymentMethod,
	mandateId,
}: {
	today: Dayjs;
	user: EmailUser;
	currency: CurrencyCode;
	billingPeriod: EmailBillingPeriod;
	subscriptionNumber: string;
	paymentSchedule: EmailPaymentSchedule;
	paymentMethod: EmailPaymentMethod;
	mandateId?: string;
}): EmailMessageWithIdentityUserId {
	const deliveryFields = buildDeliveryEmailFields({
		today: today,
		user: user,
		subscriptionNumber: subscriptionNumber,
		currency: currency,
		billingPeriod: billingPeriod,
		paymentMethod: paymentMethod,
		paymentSchedule: paymentSchedule,
		isFixedTerm: false,
		mandateId: mandateId,
	});
	const additionalFields: Record<string, string> = {
		billing_period: billingPeriod.toLowerCase(),
	};
	const productFields = {
		...additionalFields,
		...deliveryFields,
	};
	return buildEmailFields(
		user,
		DataExtensionNames.day0Emails.tierThree,
		productFields,
	);
}
