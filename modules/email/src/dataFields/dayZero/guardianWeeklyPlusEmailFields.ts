import type { Dayjs } from 'dayjs';
import { DataExtensionNames } from '@modules/email/email';
import type { EmailMessageWithIdentityUserId } from '@modules/email/email';
import type { IsoCurrency } from '@modules/internationalisation/currency';
import type { TaxMode } from '@modules/product-catalog/productCatalog';
import type { ProductPurchase } from '@modules/product-catalog/productPurchaseSchema';
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
	taxMode,
}: {
	today: Dayjs;
	user: EmailUser;
	currency: IsoCurrency;
	billingPeriod: EmailBillingPeriod;
	subscriptionNumber: string;
	paymentSchedule: EmailPaymentSchedule;
	paymentMethod: EmailPaymentMethod;
	isFixedTerm: boolean;
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
		isFixedTerm: isFixedTerm,
		mandateId: mandateId,
		taxMode,
	});

	return buildEmailFields(
		user,
		DataExtensionNames.day0Emails.guardianWeeklyPlus,
		deliveryFields,
	);
}
