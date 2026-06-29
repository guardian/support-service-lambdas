import type { EmailMessageWithIdentityUserId } from '@modules/email/email';
import { DataExtensionNames } from '@modules/email/email';
import type { CurrencyCode } from '@modules/internationalisation/currency';
import type { Dayjs } from 'dayjs';
import { buildEmailFields, buildNonDeliveryEmailFields } from './emailFields';
import type {
	EmailPaymentMethod,
	EmailPaymentSchedule,
	EmailUser,
} from './types';

export function buildGuardianAdLiteEmailFields({
	today,
	user,
	subscriptionNumber,
	currency,
	paymentMethod,
	paymentSchedule,
	mandateId,
}: {
	today: Dayjs;
	user: EmailUser;
	subscriptionNumber: string;
	currency: CurrencyCode;
	paymentMethod: EmailPaymentMethod;
	paymentSchedule: EmailPaymentSchedule;
	mandateId?: string;
}): EmailMessageWithIdentityUserId {
	const nonDeliveryEmailFields = buildNonDeliveryEmailFields({
		today: today,
		user,
		subscriptionNumber,
		currency,
		billingPeriod: 'Monthly', // Guardian Ad Lite is always billed monthly
		paymentMethod,
		paymentSchedule,
		mandateId: mandateId,
		isFixedTerm: false, // Guardian Ad-Lite has no fixed term rate plans
	});

	return buildEmailFields(
		user,
		DataExtensionNames.day0Emails.guardianAdLite,
		nonDeliveryEmailFields,
	);
}
