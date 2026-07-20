import type dayjs from 'dayjs';
import { DataExtensionNames } from '@modules/email/email';
import type { IsoCurrency } from '@modules/internationalisation/currency';
import { buildEmailFields, buildNonDeliveryEmailFields } from './emailFields';
import { getPaymentMethodFieldsSupporterPlus } from './paymentEmailFields';
import type {
	EmailBillingPeriod,
	EmailPaymentMethod,
	EmailPaymentSchedule,
	EmailUser,
	TaxMode,
} from './types';

export function buildSupporterPlusEmailFields({
	today,
	user,
	currency,
	billingPeriod,
	subscriptionNumber,
	paymentSchedule,
	paymentMethod,
	isFixedTerm,
	mandateId,
	taxMode,
}: {
	today: dayjs.Dayjs;
	user: EmailUser;
	currency: IsoCurrency;
	billingPeriod: EmailBillingPeriod;
	subscriptionNumber: string;
	paymentSchedule: EmailPaymentSchedule;
	paymentMethod: EmailPaymentMethod;
	isFixedTerm: boolean;
	mandateId?: string;
	taxMode: TaxMode;
}) {
	const nonDeliveryEmailFields = buildNonDeliveryEmailFields({
		today: today,
		user,
		subscriptionNumber,
		currency,
		billingPeriod,
		paymentMethod,
		paymentSchedule,
		mandateId,
		isFixedTerm,
		taxMode,
	});
	const oldNonStandardPaymentFields = getPaymentMethodFieldsSupporterPlus(
		paymentMethod,
		today,
		mandateId,
	);
	const productFields = {
		currency: currency,
		billing_period: billingPeriod.toLowerCase(),
		is_fixed_term: isFixedTerm.toString(),
		...(oldNonStandardPaymentFields ?? {}),
		...nonDeliveryEmailFields,
	};
	return buildEmailFields(
		user,
		DataExtensionNames.day0Emails.supporterPlus,
		productFields,
	);
}
