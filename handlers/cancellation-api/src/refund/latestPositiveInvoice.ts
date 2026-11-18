import { maxBy } from '@modules/arrayFunctions';
import type { RefundInvoiceItem } from './refundAmount';
import { groupByInvoice, invoiceTotalPence } from './refundAmount';

/**
 * When no refund is due, the workflow checks the payment on the subscription's latest positive invoice: the one
 * paying for the current period, which a failed Direct Debit leaves unpaid.
 */
export function getLatestPositiveInvoiceId(
	invoiceItems: RefundInvoiceItem[],
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
