import {
	getLatestNegativeInvoiceId,
	getLatestPositiveInvoiceId,
} from '../../src/refund/latestInvoice';

const item = (InvoiceId: string, ChargeDate: string, ChargeAmount: number) => ({
	Id: `${InvoiceId}-item`,
	InvoiceId,
	ChargeDate,
	ChargeAmount,
	TaxAmount: 0,
});

describe('getLatestPositiveInvoiceId', () => {
	it('ignores later invoices that are not positive', () => {
		expect(
			getLatestPositiveInvoiceId([
				item('first', '2026-09-01T00:00:00.000Z', 12),
				item('current', '2026-10-01T00:00:00.000Z', 12),
				item('negative', '2026-10-15T00:00:00.000Z', -12),
				item('zero', '2026-11-01T00:00:00.000Z', 0),
			]),
		).toBe('current');
	});

	it('throws if there is no positive invoice', () => {
		expect(() =>
			getLatestPositiveInvoiceId([item('zero', '2026-11-01T00:00:00.000Z', 0)]),
		).toThrow('Subscription has no positive invoice');
	});
});

describe('getLatestNegativeInvoiceId', () => {
	it('ignores later invoices that are not negative', () => {
		expect(
			getLatestNegativeInvoiceId([
				item('earlier credit', '2026-09-15T00:00:00.000Z', -12),
				item('unpaid', '2026-10-01T00:00:00.000Z', 12),
				item('credit', '2026-10-15T00:00:00.000Z', -12),
				item('zero', '2026-11-01T00:00:00.000Z', 0),
			]),
		).toBe('credit');
	});

	it('throws if there is no negative invoice', () => {
		expect(() =>
			getLatestNegativeInvoiceId([
				item('paid', '2026-11-01T00:00:00.000Z', 12),
			]),
		).toThrow('Subscription has no negative invoice');
	});
});
