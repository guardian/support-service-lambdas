import { PermanentError } from './permanentError';
import { groupByInvoice, invoiceTotalPence } from './refundAmount';
import type { SubscriptionInvoiceItem } from './subscriptionInvoiceItem';

/**
 * Invoices are generated per account, so an account with more than one subscription can have their charges on the
 * same invoice. Zeroing such an invoice would also credit the other subscription's charges, so it is left for manual
 * balancing.
 */
export function checkInvoiceOnlyForSubscription({
	invoiceId,
	invoiceAmountPence,
	subscriptionInvoiceItems,
}: {
	invoiceId: string;
	invoiceAmountPence: number;
	subscriptionInvoiceItems: SubscriptionInvoiceItem[];
}): void {
	const invoice = groupByInvoice(subscriptionInvoiceItems).find(
		(group) => group.invoiceId === invoiceId,
	);
	const subscriptionTotalPence = invoice ? invoiceTotalPence(invoice) : 0;
	if (subscriptionTotalPence !== invoiceAmountPence) {
		throw new PermanentError(
			`Invoice ${invoiceId} includes other subscriptions' charges (subscription total ${subscriptionTotalPence}p, invoice amount ${invoiceAmountPence}p), so it can't be balanced automatically`,
		);
	}
}
