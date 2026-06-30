import type { CurrencyCode } from '@modules/internationalisation/currency';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type {
	DataExtensionName,
	EmailMessageWithIdentityUserId,
} from '@modules/email/email';
import { describePayments, firstPayment } from './paymentDescription';
import type { EmailPaymentFields } from './paymentEmailFields';
import { getPaymentFields } from './paymentEmailFields';
import type {
	EmailBillingPeriod,
	EmailPaymentMethod,
	EmailPaymentSchedule,
	EmailUser,
} from './types';

type EmailCommonFields = {
	first_name: string;
	last_name: string;
	subscriber_id: string;
	subscription_rate: string;
};

export type NonDeliveryEmailFields = EmailCommonFields & EmailPaymentFields;

export function buildNonDeliveryEmailFields({
	today,
	user,
	subscriptionNumber,
	currency,
	billingPeriod,
	paymentMethod,
	paymentSchedule,
	isFixedTerm,
	mandateId,
}: {
	today: Dayjs;
	user: EmailUser;
	subscriptionNumber: string;
	currency: CurrencyCode;
	billingPeriod: EmailBillingPeriod;
	paymentMethod: EmailPaymentMethod;
	paymentSchedule: EmailPaymentSchedule;
	isFixedTerm: boolean;
	mandateId?: string;
}): NonDeliveryEmailFields {
	const paymentFields = getPaymentFields(
		today,
		paymentMethod,
		dayjs(firstPayment(paymentSchedule).date),
		mandateId,
	);
	const subscriptionDetails = describePayments(
		paymentSchedule,
		billingPeriod,
		currency,
		isFixedTerm,
	);
	return {
		first_name: user.firstName,
		last_name: user.lastName,
		subscriber_id: subscriptionNumber,
		subscription_rate: subscriptionDetails,
		...paymentFields,
	};
}

export function buildEmailFields(
	user: EmailUser,
	dataExtensionName: DataExtensionName,
	productSpecificFields: Record<string, string>,
	sfContactId?: string,
): EmailMessageWithIdentityUserId {
	return {
		To: {
			Address: user.primaryEmailAddress,
			ContactAttributes: {
				SubscriberAttributes: {
					...productSpecificFields,
				},
			},
		},
		DataExtensionName: dataExtensionName,
		IdentityUserId: user.id,
		...(sfContactId ? { SfContactId: sfContactId } : undefined),
	};
}
