import type { SpreadInvoiceItem } from '../../src/refund/spreadRefund';
import { spreadRefund } from '../../src/refund/spreadRefund';
import negativeChargeInvoice from './fixtures/negativeChargeInvoiceItems.json';
import zeroAndNegativeChargeInvoice from './fixtures/zeroAndNegativeChargeInvoiceItems.json';

const taxedItem: SpreadInvoiceItem = {
	Id: 'item-1',
	InvoiceId: 'invoice-1',
	ChargeAmount: 10,
	TaxAmount: 2,
};
const taxationItems = [{ Id: 'tax-1', InvoiceItemId: 'item-1' }];

describe('spreadRefund', () => {
	it('spreads the refund over several items, skipping negative ones', () => {
		expect(
			spreadRefund({
				refundAmount: 14.42,
				invoiceItems: negativeChargeInvoice.records,
				taxationItems: [],
				existingAdjustments: [],
			}),
		).toEqual([
			{
				InvoiceId: '8ad08d2989d472170189da366b940c8b',
				SourceType: 'InvoiceDetail',
				SourceId: '8ad08d2989d472170189da366b9f0c8c',
				Type: 'Credit',
				Amount: 10,
			},
			{
				InvoiceId: '8ad08d2989d472170189da366b940c8b',
				SourceType: 'InvoiceDetail',
				SourceId: '8ad08d2989d472170189da366b9f0c8e',
				Type: 'Credit',
				Amount: 4.42,
			},
		]);
	});

	it('takes the whole refund from one item when it has enough available', () => {
		expect(
			spreadRefund({
				refundAmount: 70,
				invoiceItems: zeroAndNegativeChargeInvoice.records,
				taxationItems: [],
				existingAdjustments: [],
			}),
		).toEqual([
			{
				InvoiceId: '8ad093788bc82157018bc97ce7457024',
				SourceType: 'InvoiceDetail',
				SourceId: '8ad093788bc82157018bc97ce7557027',
				Type: 'Credit',
				Amount: 70,
			},
		]);
	});

	it('refunds tax with a separate adjustment against the taxation item', () => {
		expect(
			spreadRefund({
				refundAmount: 12,
				invoiceItems: [taxedItem],
				taxationItems,
				existingAdjustments: [],
			}),
		).toEqual([
			{
				InvoiceId: 'invoice-1',
				SourceType: 'InvoiceDetail',
				SourceId: 'item-1',
				Type: 'Credit',
				Amount: 10,
			},
			{
				InvoiceId: 'invoice-1',
				SourceType: 'Tax',
				SourceId: 'tax-1',
				Type: 'Credit',
				Amount: 2,
			},
		]);
	});

	it('only uses the amount left after earlier adjustments, ignoring cancelled ones', () => {
		expect(
			spreadRefund({
				refundAmount: 4,
				invoiceItems: [taxedItem],
				taxationItems,
				existingAdjustments: [
					{
						SourceId: 'item-1',
						Type: 'Credit',
						Status: 'Processed',
						Amount: 9,
					},
					{
						SourceId: 'item-1',
						Type: 'Charge',
						Status: 'Processed',
						Amount: 2,
					},
					{ SourceId: 'item-1', Type: 'Credit', Status: 'Canceled', Amount: 3 },
					{ SourceId: 'tax-1', Type: 'Credit', Status: 'Processed', Amount: 1 },
				],
			}),
		).toEqual([
			{
				InvoiceId: 'invoice-1',
				SourceType: 'InvoiceDetail',
				SourceId: 'item-1',
				Type: 'Credit',
				Amount: 3,
			},
			{
				InvoiceId: 'invoice-1',
				SourceType: 'Tax',
				SourceId: 'tax-1',
				Type: 'Credit',
				Amount: 1,
			},
		]);
	});

	it('rounds the refund half up to whole pence', () => {
		expect(
			spreadRefund({
				refundAmount: 4.425,
				invoiceItems: [taxedItem],
				taxationItems,
				existingAdjustments: [],
			}).map((adjustment) => adjustment.Amount),
		).toEqual([4.43]);
	});

	it('returns no adjustments for a zero refund', () => {
		expect(
			spreadRefund({
				refundAmount: 0,
				invoiceItems: [taxedItem],
				taxationItems,
				existingAdjustments: [],
			}),
		).toEqual([]);
	});

	it('throws if the items do not have enough available to cover the refund', () => {
		expect(() =>
			spreadRefund({
				refundAmount: 12.01,
				invoiceItems: [taxedItem],
				taxationItems,
				existingAdjustments: [],
			}),
		).toThrow('only have 12 available');
	});

	it('throws if tax needs refunding but there is no taxation item', () => {
		expect(() =>
			spreadRefund({
				refundAmount: 11,
				invoiceItems: [taxedItem],
				taxationItems: [],
				existingAdjustments: [],
			}),
		).toThrow('no taxation item');
	});

	it('throws for a negative refund', () => {
		expect(() =>
			spreadRefund({
				refundAmount: -1,
				invoiceItems: [taxedItem],
				taxationItems,
				existingAdjustments: [],
			}),
		).toThrow('must not be negative');
	});
});
