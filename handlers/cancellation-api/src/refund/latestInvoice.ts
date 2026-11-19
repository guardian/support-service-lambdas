import { maxBy } from '@modules/arrayFunctions';
import { groupByInvoice, invoiceTotalPence } from './refundAmount';
import type { SubscriptionInvoiceItem } from './subscriptionInvoiceItem';

function getLatestInvoiceId(
	invoiceItems: SubscriptionInvoiceItem[],
	sign: 'positive' | 'negative',
): string {
	const predicate =
		sign === 'positive'
			? (invoiceTotal: number) => invoiceTotal > 0
			: (invoiceTotal: number) => invoiceTotal < 0;

	const latest = maxBy(
		groupByInvoice(invoiceItems).filter((invoice) =>
			predicate(invoiceTotalPence(invoice)),
		),
		({ chargeDate }) => chargeDate,
	);
	if (latest === undefined) {
		throw new Error(`Subscription has no ${sign} invoice`);
	}
	return latest.invoiceId;
}

/**
 * When no refund is due, the workflow checks the payment on the subscription's latest positive invoice: the one
 * paying for the current period, which a failed Direct Debit leaves unpaid.
 */
export const getLatestPositiveInvoiceId = (
	invoiceItems: SubscriptionInvoiceItem[],
): string => getLatestInvoiceId(invoiceItems, 'positive');

/**
 * After a failed Direct Debit, the subscription's latest negative invoice is the credit for the unpaid period, from
 * whichever cancellation covers it.
 */
export const getLatestNegativeInvoiceId = (
	invoiceItems: SubscriptionInvoiceItem[],
): string => getLatestInvoiceId(invoiceItems, 'negative');
