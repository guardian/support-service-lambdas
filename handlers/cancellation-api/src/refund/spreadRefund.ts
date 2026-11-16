import { fromPence, toPence } from './money';

/**
 * Zuora can't refund an invoice in one go: after creating the refund, the paid invoice must be credited
 * by the same amount with invoice item adjustments, or the next bill run collects the money again.
 * This spreads the refund across the invoice's items, in order, up to the amount still available on each
 * (charge plus tax, net of earlier adjustments). Tax needs its own adjustment against the taxation item.
 */

export type SpreadInvoiceItem = {
	Id: string;
	InvoiceId: string;
	ChargeAmount: number;
	TaxAmount: number;
};

export type SpreadTaxationItem = {
	Id: string;
	InvoiceItemId: string;
};

export type ExistingInvoiceItemAdjustment = {
	SourceId: string;
	Type: 'Credit' | 'Charge';
	Status: string;
	Amount: number;
};

export type NewInvoiceItemAdjustment = {
	InvoiceId: string;
	SourceType: 'InvoiceDetail' | 'Tax';
	SourceId: string;
	Type: 'Credit';
	Amount: number;
};

export function spreadRefund({
	refundAmount,
	invoiceItems,
	taxationItems,
	existingAdjustments,
}: {
	refundAmount: number;
	invoiceItems: SpreadInvoiceItem[];
	taxationItems: SpreadTaxationItem[];
	existingAdjustments: ExistingInvoiceItemAdjustment[];
}): NewInvoiceItemAdjustment[] {
	const refundPence = toPence(refundAmount);
	if (refundPence < 0) {
		throw new Error(`Refund amount ${refundAmount} must not be negative`);
	}
	const creditedPence = netCreditedPenceBySourceId(existingAdjustments);
	const credited = (sourceId: string | undefined) =>
		sourceId === undefined ? 0 : (creditedPence.get(sourceId) ?? 0);

	const adjustments: NewInvoiceItemAdjustment[] = [];
	let remainingPence = refundPence;
	for (const item of invoiceItems) {
		if (remainingPence === 0) {
			break;
		}
		const taxationItemId = taxationItems.find(
			(taxationItem) => taxationItem.InvoiceItemId === item.Id,
		)?.Id;
		const chargeAvailablePence = Math.max(
			0,
			toPence(item.ChargeAmount) - credited(item.Id),
		);
		const taxAvailablePence = Math.max(
			0,
			toPence(item.TaxAmount) - credited(taxationItemId),
		);

		const chargePence = Math.min(chargeAvailablePence, remainingPence);
		const taxPence = Math.min(taxAvailablePence, remainingPence - chargePence);

		if (chargePence > 0) {
			adjustments.push({
				InvoiceId: item.InvoiceId,
				SourceType: 'InvoiceDetail',
				SourceId: item.Id,
				Type: 'Credit',
				Amount: fromPence(chargePence),
			});
		}
		if (taxPence > 0) {
			if (taxationItemId === undefined) {
				throw new Error(
					`Invoice item ${item.Id} has tax to refund but no taxation item`,
				);
			}
			adjustments.push({
				InvoiceId: item.InvoiceId,
				SourceType: 'Tax',
				SourceId: taxationItemId,
				Type: 'Credit',
				Amount: fromPence(taxPence),
			});
		}
		remainingPence -= chargePence + taxPence;
	}

	if (remainingPence > 0) {
		throw new Error(
			`Can't spread refund of ${refundAmount}: the invoice items only have ${fromPence(refundPence - remainingPence)} available to adjust`,
		);
	}
	return adjustments;
}

function netCreditedPenceBySourceId(
	adjustments: ExistingInvoiceItemAdjustment[],
): Map<string, number> {
	const credited = new Map<string, number>();
	for (const adjustment of adjustments) {
		if (adjustment.Status === 'Canceled') {
			continue;
		}
		const pence =
			adjustment.Type === 'Credit'
				? toPence(adjustment.Amount)
				: -toPence(adjustment.Amount);
		credited.set(
			adjustment.SourceId,
			(credited.get(adjustment.SourceId) ?? 0) + pence,
		);
	}
	return credited;
}
