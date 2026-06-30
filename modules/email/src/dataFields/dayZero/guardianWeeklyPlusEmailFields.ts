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

export type GuardianWeeklyProductPurchase = Extract<
	ProductPurchase,
	{ product: 'GuardianWeeklyDomestic' | 'GuardianWeeklyRestOfWorld' }
>;

export function buildGuardianWeeklyPlusEmailFields({
	today,
	user,
	currency,
	billingPeriod,
	subscriptionNumber,
	paymentSchedule,
	paymentMethod,
	isFixedTerm,
	mandateId,
}: {
	today: Dayjs;
	user: EmailUser;
	currency: CurrencyCode;
	billingPeriod: EmailBillingPeriod;
	subscriptionNumber: string;
	paymentSchedule: EmailPaymentSchedule;
	paymentMethod: EmailPaymentMethod;
	isFixedTerm: boolean;
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
		isFixedTerm: isFixedTerm,
		mandateId: mandateId,
	});

	return buildEmailFields(
		user,
		DataExtensionNames.day0Emails.guardianWeeklyPlus,
		deliveryFields,
	);
}
