import { PermanentError } from './permanentError';
import type { SubscriptionInvoiceItem } from './subscriptionInvoiceItem';

/**
 * Invoices are generated per account, so an account with more than one subscription can have their charges on the
 * same invoice. Zeroing such an invoice would also adjust the other subscription's items, so it is left for manual
 * balancing.
 */
export function checkInvoiceOnlyForSubscription({
	invoiceId,
	invoiceItemIds,
	subscriptionInvoiceItems,
}: {
	invoiceId: string;
	invoiceItemIds: string[];
	subscriptionInvoiceItems: SubscriptionInvoiceItem[];
}): void {
	const subscriptionItemIds = new Set(
		subscriptionInvoiceItems.map((item) => item.Id),
	);
	const otherItemIds = invoiceItemIds.filter(
		(id) => !subscriptionItemIds.has(id),
	);
	if (otherItemIds.length > 0) {
		throw new PermanentError(
			`Invoice ${invoiceId} has items ${otherItemIds.join(', ')} from other subscriptions, so it can't be balanced automatically`,
		);
	}
}
