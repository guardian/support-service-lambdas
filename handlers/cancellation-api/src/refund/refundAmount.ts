/**
 * The refund is the total (charges plus tax) of the invoice before the negative (cancellation) invoice.
 */

export type RefundInvoiceItem = {
	Id: string;
	InvoiceId: string;
	ChargeDate: string;
	ChargeAmount: number;
	TaxAmount: number;
};

export type RefundAmount = {
	refundAmount: number;
	paidInvoiceId: string;
};

type InvoiceGroup = {
	invoiceId: string;
	// an invoice is dated by its first item's ChargeDate
	chargeDate: number;
	items: RefundInvoiceItem[];
};

const toPence = (amount: number) => Math.round(amount * 100);

export function calculateRefundAmount({
	negativeInvoiceId,
	invoiceItems,
}: {
	negativeInvoiceId: string;
	invoiceItems: RefundInvoiceItem[];
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
	const [paidInvoice] = invoices
		.filter(
			(invoice) =>
				invoice !== negativeInvoice &&
				invoice.chargeDate <= negativeInvoice.chargeDate,
		)
		.sort((a, b) => b.chargeDate - a.chargeDate);
	if (paidInvoice === undefined) {
		throw new Error(
			`No invoice to refund before negative invoice ${negativeInvoiceId}`,
		);
	}

	const refundPence = paidInvoice.items.reduce(
		(total, item) =>
			total + toPence(item.ChargeAmount) + toPence(item.TaxAmount),
		0,
	);

	return {
		refundAmount: refundPence / 100,
		paidInvoiceId: paidInvoice.invoiceId,
	};
}

function groupByInvoice(invoiceItems: RefundInvoiceItem[]): InvoiceGroup[] {
	const groups = new Map<string, InvoiceGroup>();
	for (const item of invoiceItems) {
		const group = groups.get(item.InvoiceId);
		if (group) {
			group.items.push(item);
		} else {
			const chargeDate = Date.parse(item.ChargeDate);
			if (Number.isNaN(chargeDate)) {
				throw new Error(
					`Invalid ChargeDate ${item.ChargeDate} on invoice item ${item.Id}`,
				);
			}
			groups.set(item.InvoiceId, {
				invoiceId: item.InvoiceId,
				chargeDate,
				items: [item],
			});
		}
	}
	return [...groups.values()];
}
