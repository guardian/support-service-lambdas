import type { Dayjs } from 'dayjs';
import type { EmailMessageWithIdentityUserId } from '@modules/email/email';
import { DataExtensionNames } from '@modules/email/email';
import type { IsoCurrency } from '@modules/internationalisation/currency';
import { buildEmailFields, buildNonDeliveryEmailFields } from './emailFields';
import type {
	EmailBillingPeriod,
	EmailPaymentMethod,
	EmailPaymentSchedule,
	EmailUser,
	TaxMode,
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
		taxMode,
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
