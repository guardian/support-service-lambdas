import dayjs from 'dayjs';
import { sortBy } from '@modules/arrayFunctions';
import type { EmailMessageWithUserId } from '@modules/email/email';
import { buildEmailMessage, DataExtensionNames } from '@modules/email/email';

export type PaymentFailedInvoiceItem = {
	ProductName: string;
	ChargeAmount: number;
	ServiceStartDate: string;
	ServiceEndDate: string;
};

export type PaymentFailedEmailData = {
	subscriptionNumber: string;
	unpaidInvoiceId: string;
	sfContactId: string | undefined;
	emailAddress: string | undefined;
	firstName: string;
	lastName: string;
	paymentMethod:
		| {
				type: string;
				cardType: string | undefined;
				cardExpiryMonth: number | undefined;
				cardExpiryYear: number | undefined;
		  }
		| undefined;
	invoiceItems: PaymentFailedInvoiceItem[];
};

const serviceDate = (date: string) => dayjs(date).format('DD MMMM YYYY');

/**
 * Tells the customer their subscription was cancelled from the start of the period their payment failed for.
 * The product and service period come from the unpaid invoice's charge, ignoring discounts and credits.
 */
export function buildPaymentFailedEmail({
	subscriptionNumber,
	unpaidInvoiceId,
	sfContactId,
	emailAddress,
	firstName,
	lastName,
	paymentMethod,
	invoiceItems,
}: PaymentFailedEmailData): EmailMessageWithUserId {
	if (!emailAddress) {
		throw new Error('The account has no email address');
	}
	if (!sfContactId) {
		throw new Error('The account has no Salesforce contact');
	}
	const charge = sortBy(
		invoiceItems.filter(({ ChargeAmount }) => ChargeAmount > 0),
		({ ServiceStartDate }) => ServiceStartDate,
	)[0];
	if (charge === undefined) {
		throw new Error(`Invoice ${unpaidInvoiceId} has no charges`);
	}
	const { cardExpiryMonth, cardExpiryYear } = paymentMethod ?? {};

	return buildEmailMessage(
		emailAddress,
		DataExtensionNames.cancelledPaymentEmail,
		{
			subscriber_id: subscriptionNumber,
			product: charge.ProductName,
			payment_method: paymentMethod?.type ?? '',
			card_type: paymentMethod?.cardType ?? '',
			card_expiry_date:
				cardExpiryMonth !== undefined && cardExpiryYear !== undefined
					? `${String(cardExpiryMonth).padStart(2, '0')}/${cardExpiryYear}`
					: '',
			first_name: firstName,
			last_name: lastName,
			invoiceId: unpaidInvoiceId,
			serviceStartDate: serviceDate(charge.ServiceStartDate),
			serviceEndDate: serviceDate(charge.ServiceEndDate),
		},
		{ SfContactId: sfContactId },
	);
}
