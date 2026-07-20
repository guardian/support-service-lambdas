import type { Dayjs } from 'dayjs';
import { DataExtensionNames } from '@modules/email/email';
import type { EmailMessageWithIdentityUserId } from '@modules/email/email';
import type { IsoCurrency } from '@modules/internationalisation/currency';
import type { ProductPurchase } from '@modules/product-catalog/productPurchaseSchema';
import { buildDeliveryEmailFields } from './deliveryEmailFields';
import { buildEmailFields } from './emailFields';
import type {
	EmailBillingPeriod,
	EmailPaymentMethod,
	EmailPaymentSchedule,
	EmailUser,
	TaxMode,
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
	taxMode,
}: {
	today: Dayjs;
	user: EmailUser;
	currency: IsoCurrency;
	billingPeriod: EmailBillingPeriod;
	subscriptionNumber: string;
	paymentSchedule: EmailPaymentSchedule;
	paymentMethod: EmailPaymentMethod;
	mandateId?: string;
	taxMode: TaxMode;
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
		taxMode,
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
