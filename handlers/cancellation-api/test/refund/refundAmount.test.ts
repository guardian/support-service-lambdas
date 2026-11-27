import { z } from 'zod';
import { calculateRefundAmount } from '../../src/refund/refundAmount';
import { subscriptionInvoiceItemSchema } from '../../src/refund/subscriptionInvoiceItem';
import amountChangedSubJson from './fixtures/amountChangedSubInvoiceItems.json';
import discountedSubJson from './fixtures/discountedSubInvoiceItems.json';
import standardSubJson from './fixtures/standardSubInvoiceItems.json';
import switchedSubJson from './fixtures/switchedSubInvoiceItems.json';
import taxedSubJson from './fixtures/taxedSubInvoiceItems.json';
import taxedSwitchedSubJson from './fixtures/taxedSwitchedSubInvoiceItems.json';

const parseItems = ({ records }: { records: unknown[] }) =>
	z.array(subscriptionInvoiceItemSchema).parse(records);
const amountChangedSub = parseItems(amountChangedSubJson);
const discountedSub = parseItems(discountedSubJson);
const standardSub = parseItems(standardSubJson);
const switchedSub = parseItems(switchedSubJson);
const taxedSub = parseItems(taxedSubJson);
const taxedSwitchedSub = parseItems(taxedSwitchedSubJson);

describe('calculateRefundAmount', () => {
	it('refunds the paid invoice for a regular cancelled sub', () => {
		expect(
			calculateRefundAmount({
				negativeInvoiceId: '8ad09b2186b5fdb50186b708669f2114',
				invoiceItems: standardSub,
			}),
		).toEqual({
			refundAmount: 20,
			paidInvoiceId: '8ad08c8486b5ec340186b70539871852',
		});
	});

	it('refunds the switch invoice, net of the credit for the old product, for a switched sub', () => {
		expect(
			calculateRefundAmount({
				negativeInvoiceId: '8ad0934e86a19cca0186a817d551251e',
				invoiceItems: switchedSub,
			}),
		).toEqual({
			refundAmount: 12.14,
			paidInvoiceId: '8ad08d2986a18ded0186a811f7e56e01',
		});
	});

	it('includes tax for a switched sub where tax has been paid', () => {
		expect(
			calculateRefundAmount({
				negativeInvoiceId: '8ad08dc989e27bbe0189e40e61110aba',
				invoiceItems: taxedSwitchedSub,
			}),
		).toEqual({
			refundAmount: 10,
			paidInvoiceId: '8ad081c689e27bbb0189e3d654f104ba',
		});
	});

	it('includes tax across several charges', () => {
		expect(
			calculateRefundAmount({
				negativeInvoiceId: '8a1289288995cad501899c3fa6b0501c',
				invoiceItems: taxedSub,
			}),
		).toEqual({
			refundAmount: 12,
			paidInvoiceId: '8a129f89898cbdf301898ee88c0f085f',
		});
	});

	it('refunds only the latest paid invoice when there are several months of invoices', () => {
		expect(
			calculateRefundAmount({
				negativeInvoiceId: '8ad09e2089cf509b0189cfabed210ab2',
				invoiceItems: amountChangedSub,
			}),
		).toEqual({
			refundAmount: 2.42,
			paidInvoiceId: '8ad09e2089cf509b0189cfa861436d26',
		});
	});

	it('refunds the discounted amount for a discounted sub', () => {
		expect(
			calculateRefundAmount({
				negativeInvoiceId: '8a12867e90766628019084f204f15333',
				invoiceItems: discountedSub,
			}),
		).toEqual({
			refundAmount: 5,
			paidInvoiceId: '8a12997890498d8901904fed778f1762',
		});
	});

	it('does not depend on the order of the invoice items', () => {
		const negativeInvoiceId = '8ad09e2089cf509b0189cfabed210ab2';
		expect(
			calculateRefundAmount({
				negativeInvoiceId,
				invoiceItems: [...amountChangedSub].reverse(),
			}),
		).toEqual(
			calculateRefundAmount({
				negativeInvoiceId,
				invoiceItems: amountChangedSub,
			}),
		);
	});

	it('ignores invoices charged after the negative invoice', () => {
		const [paid, negative] = standardSub;
		const later = {
			...paid!,
			Id: 'later-item',
			InvoiceId: 'later-invoice',
			ChargeDate: '2030-01-01T00:00:00.000+00:00',
		};
		expect(
			calculateRefundAmount({
				negativeInvoiceId: negative!.InvoiceId,
				invoiceItems: [...standardSub, later],
			}).paidInvoiceId,
		).toBe(paid!.InvoiceId);
	});

	it('fails when the negative invoice is not in the invoice items', () => {
		expect(() =>
			calculateRefundAmount({
				negativeInvoiceId: 'missing',
				invoiceItems: standardSub,
			}),
		).toThrow('Negative invoice missing is not in');
	});

	it('fails when there is no invoice before the negative invoice', () => {
		const negativeOnly = standardSub.slice(1);
		expect(() =>
			calculateRefundAmount({
				negativeInvoiceId: negativeOnly[0]!.InvoiceId,
				invoiceItems: negativeOnly,
			}),
		).toThrow('No invoice to refund');
	});
});
