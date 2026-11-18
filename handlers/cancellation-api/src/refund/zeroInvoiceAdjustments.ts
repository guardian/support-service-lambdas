import { sum } from '@modules/arrayFunctions';
import type {
	InvoiceItem,
	InvoiceItemAdjustmentSourceType,
	InvoiceItemAdjustmentType,
} from '@modules/zuora/types';
import { fromPence, toPence } from './money';

/**
 * Builds the invoice item adjustments that bring an invoice's balance to zero, e.g. the paid invoice after
 * it is refunded, so the next bill run doesn't collect the money again.
 * Every item and tax line is adjusted by its availableToCreditAmount (net of earlier adjustments):
 * positive amounts are credited and negative ones (e.g. discounts) are charged.
 * expectedTotal should be the invoice's current balance, so a partly adjusted invoice can be finished off.
 */

export type InvoiceAdjustment = {
	SourceType: InvoiceItemAdjustmentSourceType;
	SourceId: string;
	Type: InvoiceItemAdjustmentType;
	Amount: number;
};

export function zeroInvoiceAdjustments({
	invoiceItems,
	expectedTotal,
}: {
	invoiceItems: InvoiceItem[];
	expectedTotal: number;
}): InvoiceAdjustment[] {
	const adjustments = invoiceItems.flatMap((item) => [
		adjustment('InvoiceDetail', item.id, item.availableToCreditAmount),
		...item.taxationItems.data.map((tax) =>
			adjustment('Tax', tax.id, tax.availableToCreditAmount),
		),
	]);

	const totalPence = sum(adjustments, ({ pence }) => pence);
	if (totalPence !== toPence(expectedTotal)) {
		throw new Error(
			`Invoice items have ${fromPence(totalPence)} available to credit, expected ${expectedTotal}`,
		);
	}

	return adjustments
		.filter(({ pence }) => pence !== 0)
		.map(({ pence, ...rest }) => ({
			...rest,
			Type: pence > 0 ? 'Credit' : 'Charge',
			Amount: fromPence(Math.abs(pence)),
		}));
}

const adjustment = (
	SourceType: InvoiceItemAdjustmentSourceType,
	SourceId: string,
	availableToCreditAmount: number,
) => ({ SourceType, SourceId, pence: toPence(availableToCreditAmount) });
