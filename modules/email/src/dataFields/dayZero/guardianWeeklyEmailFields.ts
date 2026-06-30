import type { CurrencyCode } from '@modules/internationalisation/currency';
import type { ProductPurchase } from '@modules/product-catalog/productPurchaseSchema';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { EmailMessageWithIdentityUserId } from '@modules/email/email';
import { DataExtensionNames } from '@modules/email/email';
import { buildDeliveryEmailFields } from './deliveryEmailFields';
import { buildEmailFields } from './emailFields';
import { formatDate } from './paymentEmailFields';
import type {
	EmailBillingPeriod,
	EmailGiftRecipient,
	EmailPaymentMethod,
	EmailPaymentSchedule,
	EmailUser,
} from './types';

export type GuardianWeeklyProductPurchase = Extract<
	ProductPurchase,
	{ product: 'GuardianWeeklyDomestic' | 'GuardianWeeklyRestOfWorld' }
>;

export function buildGuardianWeeklyEmailFields({
	today,
	user,
	currency,
	billingPeriod,
	subscriptionNumber,
	paymentSchedule,
	paymentMethod,
	isFixedTerm,
	mandateId,
	giftRecipient,
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
	giftRecipient?: EmailGiftRecipient;
}): EmailMessageWithIdentityUserId {
	const gifteeFields = giftRecipient
		? {
				giftee_first_name: giftRecipient.firstName,
				giftee_last_name: giftRecipient.lastName,
			}
		: undefined;

	const secondPaymentFields = paymentSchedule.payments[1]
		? {
				date_of_second_payment: formatDate(
					dayjs(paymentSchedule.payments[1].date),
				),
			}
		: undefined;

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
	const productFields = {
		...secondPaymentFields,
		...gifteeFields,
		...deliveryFields,
	};
	return buildEmailFields(
		user,
		DataExtensionNames.day0Emails.guardianWeekly,
		productFields,
	);
}
