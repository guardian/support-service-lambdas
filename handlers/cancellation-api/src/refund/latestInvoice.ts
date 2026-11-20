import { maxBy } from '@modules/arrayFunctions';
import { fromPence } from './money';
import { PermanentError } from './permanentError';
import { groupByInvoice, invoiceTotalPence } from './refundAmount';
import type { SubscriptionInvoiceItem } from './subscriptionInvoiceItem';

/**
 * When no refund is due, the workflow checks the payment on the subscription's latest positive invoice: the one
 * paying for the current period, which a failed Direct Debit leaves unpaid.
 */
export function getLatestPositiveInvoiceId(
	invoiceItems: SubscriptionInvoiceItem[],
): string {
	const latest = maxBy(
		groupByInvoice(invoiceItems).filter(
			(invoice) => invoiceTotalPence(invoice) > 0,
		),
		({ chargeDate }) => chargeDate,
	);
	if (latest === undefined) {
		throw new Error('Subscription has no positive invoice');
	}
	return latest.invoiceId;
}

/**
 * Nothing is billed after a cancellation, so the subscription's latest invoice is the cancellation's credit invoice.
 * It is £0 rather than negative if the cancelled period was free, e.g. under a 100% discount.
 */
export function getCancellationInvoiceId(
	invoiceItems: SubscriptionInvoiceItem[],
): string {
	const latest = maxBy(
		groupByInvoice(invoiceItems),
		({ chargeDate }) => chargeDate,
	);
	if (latest === undefined) {
		throw new PermanentError('Subscription has no invoices');
	}
	const total = invoiceTotalPence(latest);
	if (total > 0) {
		throw new PermanentError(
			`Latest invoice ${latest.invoiceId} is not a cancellation credit, its total is ${fromPence(total)}`,
		);
	}
	return latest.invoiceId;
}
