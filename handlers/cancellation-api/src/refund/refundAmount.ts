import { groupByToMap, maxBy, sum } from '@modules/arrayFunctions';
import { fromPence } from './money';
import type { SubscriptionInvoiceItem } from './subscriptionInvoiceItem';

/**
 * The refund is the total (charges plus tax) of the invoice before the negative (cancellation) invoice.
 */

export type RefundAmount = {
	refundAmount: number;
	paidInvoiceId: string;
};

type InvoiceGroup = {
	invoiceId: string;
	// an invoice is dated by its first item's ChargeDate
	chargeDate: number;
	items: SubscriptionInvoiceItem[];
};

export function calculateRefundAmount({
	negativeInvoiceId,
	invoiceItems,
}: {
	negativeInvoiceId: string;
	invoiceItems: SubscriptionInvoiceItem[];
}): RefundAmount {
	const invoices = groupByInvoice(invoiceItems);
	const negativeInvoice = invoices.find(
		(invoice) => invoice.invoiceId === negativeInvoiceId,
	);
	if (negativeInvoice === undefined) {
		throw new Error(
			`Negative invoice ${negativeInvoiceId} is not in the subscription's invoice items`,
		);
	}
	const paidInvoice = maxBy(
		invoices.filter(
			(invoice) =>
				invoice !== negativeInvoice &&
				invoice.chargeDate <= negativeInvoice.chargeDate,
		),
		({ chargeDate }) => chargeDate,
	);
	if (paidInvoice === undefined) {
		throw new Error(
			`No invoice to refund before negative invoice ${negativeInvoiceId}`,
		);
	}

	const refundPence = sum(
		paidInvoice.items,
		(item) => item.ChargeAmount + item.TaxAmount,
	);

	return {
		refundAmount: fromPence(refundPence),
		paidInvoiceId: paidInvoice.invoiceId,
	};
}

function groupByInvoice(
	invoiceItems: SubscriptionInvoiceItem[],
): InvoiceGroup[] {
	return [...groupByToMap(invoiceItems, (item) => item.InvoiceId)].map(
		([invoiceId, items]) => ({
			invoiceId,
			chargeDate: getChargeDate(items[0]!),
			items,
		}),
	);
}

function getChargeDate(item: SubscriptionInvoiceItem): number {
	const chargeDate = Date.parse(item.ChargeDate);
	if (Number.isNaN(chargeDate)) {
		throw new Error(
			`Invalid ChargeDate ${item.ChargeDate} on invoice item ${item.Id}`,
		);
	}
	return chargeDate;
}
