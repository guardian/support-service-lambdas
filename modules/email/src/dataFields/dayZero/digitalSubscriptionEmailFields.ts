import type { CurrencyCode } from '@modules/internationalisation/currency';
import type { Dayjs } from 'dayjs';
import type { EmailMessageWithIdentityUserId } from '@modules/email/email';
import { DataExtensionNames } from '@modules/email/email';
import { buildEmailFields, buildNonDeliveryEmailFields } from './emailFields';
import type {
	EmailBillingPeriod,
	EmailPaymentMethod,
	EmailPaymentSchedule,
	EmailUser,
} from './types';

export function buildDigitalSubscriptionEmailFields({
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
	const nonDeliveryEmailFields = buildNonDeliveryEmailFields({
		today: today,
		user,
		subscriptionNumber,
		currency,
		billingPeriod,
		paymentMethod,
		paymentSchedule,
		mandateId,
		isFixedTerm: false, // There are no fixed term Digital subscription rate plans
	});

	const productFields = {
		currency: currency,
		...nonDeliveryEmailFields,
	};
	return buildEmailFields(
		user,
		DataExtensionNames.day0Emails.digitalSubscription,
		productFields,
	);
}
