import type { InvoiceItem } from '@modules/zuora/types';
import { zeroInvoiceAdjustments } from '../../src/refund/zeroInvoiceAdjustments';

const item = (
	id: string,
	availableToCreditAmount: number,
	tax?: { id: string; availableToCreditAmount: number },
): InvoiceItem => ({
	id,
	productRatePlanChargeId: `charge-${id}`,
	availableToCreditAmount,
	taxationItems: { data: tax ? [tax] : [] },
});

describe('zeroInvoiceAdjustments', () => {
	it('credits each item and its tax separately', () => {
		expect(
			zeroInvoiceAdjustments({
				invoiceItems: [
					item('item-1', 10, { id: 'tax-1', availableToCreditAmount: 2 }),
				],
				expectedTotal: 12,
			}),
		).toEqual([
			{
				SourceType: 'InvoiceDetail',
				SourceId: 'item-1',
				Type: 'Credit',
				Amount: 10,
			},
			{ SourceType: 'Tax', SourceId: 'tax-1', Type: 'Credit', Amount: 2 },
		]);
	});

	it('charges negative items such as discounts and skips items with nothing left', () => {
		expect(
			zeroInvoiceAdjustments({
				invoiceItems: [
					item('item-1', 12),
					item('discount', -2.4),
					item('used', 0),
				],
				expectedTotal: 9.6,
			}),
		).toEqual([
			{
				SourceType: 'InvoiceDetail',
				SourceId: 'item-1',
				Type: 'Credit',
				Amount: 12,
			},
			{
				SourceType: 'InvoiceDetail',
				SourceId: 'discount',
				Type: 'Charge',
				Amount: 2.4,
			},
		]);
	});

	it('charges every item on a negative invoice', () => {
		expect(
			zeroInvoiceAdjustments({
				invoiceItems: [
					item('item-1', -10, { id: 'tax-1', availableToCreditAmount: -2 }),
				],
				expectedTotal: -12,
			}),
		).toEqual([
			{
				SourceType: 'InvoiceDetail',
				SourceId: 'item-1',
				Type: 'Charge',
				Amount: 10,
			},
			{ SourceType: 'Tax', SourceId: 'tax-1', Type: 'Charge', Amount: 2 },
		]);
	});

	it('throws if the items do not add up to the expected total', () => {
		expect(() =>
			zeroInvoiceAdjustments({
				invoiceItems: [item('item-1', 10.1), item('item-2', 0.2)],
				expectedTotal: 10.31,
			}),
		).toThrow('Invoice items have 10.3 available to credit, expected 10.31');
	});
});
