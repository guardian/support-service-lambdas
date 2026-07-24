import type { Dayjs } from 'dayjs';
import type { EmailMessageWithIdentityUserId } from '@modules/email/email';
import { DataExtensionNames } from '@modules/email/email';
import type { CurrencyCode } from '@modules/internationalisation/currency';
import type { TaxMode } from '@modules/product-catalog/productCatalog';
import { buildEmailFields, buildNonDeliveryEmailFields } from './emailFields';
import type {
	EmailBillingPeriod,
	EmailPaymentMethod,
	EmailPaymentSchedule,
	EmailUser,
} from './types';

export function buildContributionEmailFields({
	today,
	user,
	amount,
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
	amount: number;
	currency: CurrencyCode;
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
		isFixedTerm: false, // There are no fixed term contribution rate plans
		taxMode,
	});

	const productFields = {
		amount: amount.toString(),
		billing_period: billingPeriod.toLowerCase(),
		currency,
		...nonDeliveryEmailFields,
	};

	return buildEmailFields(
		user,
		DataExtensionNames.day0Emails.recurringContribution,
		productFields,
	);
}
