import { calculateRefundAmount } from '../../src/refund/refundAmount';
import amountChangedSub from './fixtures/amountChangedSubInvoiceItems.json';
import discountedSub from './fixtures/discountedSubInvoiceItems.json';
import standardSub from './fixtures/standardSubInvoiceItems.json';
import switchedSub from './fixtures/switchedSubInvoiceItems.json';
import taxedSub from './fixtures/taxedSubInvoiceItems.json';
import taxedSwitchedSub from './fixtures/taxedSwitchedSubInvoiceItems.json';

describe('calculateRefundAmount', () => {
	it('refunds the paid invoice for a regular cancelled sub', () => {
		expect(calculateRefundAmount(standardSub.records)).toEqual({
			refundAmount: 20,
			negativeInvoiceId: '8ad09b2186b5fdb50186b708669f2114',
			paidInvoiceId: '8ad08c8486b5ec340186b70539871852',
		});
	});

	it('refunds the switch invoice, net of the credit for the old product, for a switched sub', () => {
		expect(calculateRefundAmount(switchedSub.records)).toEqual({
			refundAmount: 12.14,
			negativeInvoiceId: '8ad0934e86a19cca0186a817d551251e',
			paidInvoiceId: '8ad08d2986a18ded0186a811f7e56e01',
		});
	});

	it('includes tax for a switched sub where tax has been paid', () => {
		expect(calculateRefundAmount(taxedSwitchedSub.records)).toEqual({
			refundAmount: 10,
			negativeInvoiceId: '8ad08dc989e27bbe0189e40e61110aba',
			paidInvoiceId: '8ad081c689e27bbb0189e3d654f104ba',
		});
	});

	it('includes tax across several charges', () => {
		expect(calculateRefundAmount(taxedSub.records)).toEqual({
			refundAmount: 12,
			negativeInvoiceId: '8a1289288995cad501899c3fa6b0501c',
			paidInvoiceId: '8a129f89898cbdf301898ee88c0f085f',
		});
	});

	it('refunds only the latest paid invoice when there are several months of invoices', () => {
		expect(calculateRefundAmount(amountChangedSub.records)).toEqual({
			refundAmount: 2.42,
			negativeInvoiceId: '8ad09e2089cf509b0189cfabed210ab2',
			paidInvoiceId: '8ad09e2089cf509b0189cfa861436d26',
		});
	});

	it('refunds the discounted amount for a discounted sub', () => {
		expect(calculateRefundAmount(discountedSub.records)).toEqual({
			refundAmount: 5,
			negativeInvoiceId: '8a12867e90766628019084f204f15333',
			paidInvoiceId: '8a12997890498d8901904fed778f1762',
		});
	});

	it('does not depend on the order of the invoice items', () => {
		expect(
			calculateRefundAmount([...amountChangedSub.records].reverse()),
		).toEqual(calculateRefundAmount(amountChangedSub.records));
	});

	it('fails when there is only one invoice', () => {
		const paidInvoiceOnly = standardSub.records.slice(0, 1);
		expect(() => calculateRefundAmount(paidInvoiceOnly)).toThrow(
			'at least 2 are needed',
		);
	});

	it('fails when it cannot tell which invoice is the cancellation invoice', () => {
		const [paid, negative] = standardSub.records;
		const sameDate = [paid!, { ...negative!, ChargeDate: paid!.ChargeDate }];
		expect(() => calculateRefundAmount(sameDate)).toThrow('same charge date');
	});
});
