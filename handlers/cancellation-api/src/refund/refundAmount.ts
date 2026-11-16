/**
 * After a refundable cancellation, the subscription's latest invoice is the negative (cancellation)
 * invoice, and the refund is the total (charges plus tax) of the invoice before it.
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
	negativeInvoiceId: string;
	paidInvoiceId: string;
};

type InvoiceGroup = {
	invoiceId: string;
	// an invoice is dated by its first item's ChargeDate
	chargeDate: number;
	items: RefundInvoiceItem[];
};

const toPence = (amount: number) => Math.round(amount * 100);

export function calculateRefundAmount(
	invoiceItems: RefundInvoiceItem[],
): RefundAmount {
	const invoices = groupByInvoice(invoiceItems).sort(
		(a, b) => b.chargeDate - a.chargeDate,
	);
	const [negativeInvoice, paidInvoice] = invoices;
	if (negativeInvoice === undefined || paidInvoice === undefined) {
		throw new Error(
			`Found ${invoices.length} invoice(s), but at least 2 are needed to find the cancellation invoice and the invoice to refund: ${JSON.stringify(invoiceItems)}`,
		);
	}
	if (negativeInvoice.chargeDate === paidInvoice.chargeDate) {
		throw new Error(
			`Can't tell which invoice is the cancellation invoice, because ${negativeInvoice.invoiceId} and ${paidInvoice.invoiceId} have the same charge date`,
		);
	}

	const refundPence = paidInvoice.items.reduce(
		(total, item) =>
			total + toPence(item.ChargeAmount) + toPence(item.TaxAmount),
		0,
	);

	return {
		refundAmount: refundPence / 100,
		negativeInvoiceId: negativeInvoice.invoiceId,
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
