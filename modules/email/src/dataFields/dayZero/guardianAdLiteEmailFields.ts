import type { Dayjs } from 'dayjs';
import type { EmailMessageWithIdentityUserId } from '@modules/email/email';
import { DataExtensionNames } from '@modules/email/email';
import type { IsoCurrency } from '@modules/internationalisation/currency';
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
	taxMode,
}: {
	today: Dayjs;
	user: EmailUser;
	subscriptionNumber: string;
	currency: IsoCurrency;
	paymentMethod: EmailPaymentMethod;
	paymentSchedule: EmailPaymentSchedule;
	mandateId?: string;
	taxMode: string | undefined | null;
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
		taxMode,
	});

	return buildEmailFields(
		user,
		DataExtensionNames.day0Emails.guardianAdLite,
		nonDeliveryEmailFields,
	);
}
