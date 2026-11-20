import {
	getCancellationInvoiceId,
	getLatestPositiveInvoiceId,
} from '../../src/refund/latestInvoice';
import { PermanentError } from '../../src/refund/permanentError';
import { subscriptionInvoiceItemSchema } from '../../src/refund/subscriptionInvoiceItem';

const item = (InvoiceId: string, ChargeDate: string, ChargeAmount: number) =>
	subscriptionInvoiceItemSchema.parse({
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

describe('getCancellationInvoiceId', () => {
	it('returns the latest invoice, ignoring earlier credits', () => {
		expect(
			getCancellationInvoiceId([
				item('earlier credit', '2026-09-15T00:00:00.000Z', -12),
				item('paid', '2026-10-01T00:00:00.000Z', 12),
				item('credit', '2026-10-15T00:00:00.000Z', -12),
			]),
		).toBe('credit');
	});

	it('returns a £0 credit for a free period', () => {
		expect(
			getCancellationInvoiceId([
				item('earlier credit', '2026-09-15T00:00:00.000Z', -12),
				item('free', '2026-10-01T00:00:00.000Z', 0),
				item('zero credit', '2026-10-15T00:00:00.000Z', 0),
			]),
		).toBe('zero credit');
	});

	it('fails permanently if the latest invoice is positive', () => {
		expect(() =>
			getCancellationInvoiceId([
				item('credit', '2026-10-15T00:00:00.000Z', -12),
				item('paid', '2026-11-01T00:00:00.000Z', 12),
			]),
		).toThrow(
			new PermanentError(
				'Latest invoice paid is not a cancellation credit, its total is 12',
			),
		);
	});

	it('fails permanently if there are no invoices', () => {
		expect(() => getCancellationInvoiceId([])).toThrow(
			new PermanentError('Subscription has no invoices'),
		);
	});
});
