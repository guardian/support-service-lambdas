import type { SettlementPayment } from '../../src/refund/paymentSettlement';
import { getPaymentSettlementStatus } from '../../src/refund/paymentSettlement';

const directDebit = (
	status: string,
	gatewayState: string,
): SettlementPayment => ({
	status,
	gatewayState,
	paymentMethodType: 'BankTransfer',
});
const card = (status: string): SettlementPayment => ({
	status,
	gatewayState: status === 'Processed' ? 'Submitted' : 'NotSubmitted',
	paymentMethodType: 'CreditCardReferenceTransaction',
});

const settlement = (
	latestPayment: SettlementPayment | undefined,
	invoice = { invoiceAmount: 15, invoiceBalance: 0 },
) => getPaymentSettlementStatus({ ...invoice, latestPayment });

describe('getPaymentSettlementStatus', () => {
	it('treats a zero amount invoice as settled, as there is nothing to pay', () => {
		expect(settlement(undefined, { invoiceAmount: 0, invoiceBalance: 0 })).toBe(
			'Settled',
		);
	});

	it('is pending when the invoice is owed and there is no payment yet', () => {
		expect(
			settlement(undefined, { invoiceAmount: 15, invoiceBalance: 15 }),
		).toBe('Pending');
	});

	it('is settled when the invoice was paid without a payment, e.g. from credit balance', () => {
		expect(settlement(undefined)).toBe('Settled');
	});

	it.each([
		['processed card payment', 'Settled', card('Processed')],
		['failed card payment', 'Failed', card('Error')],
		[
			'Direct Debit not yet submitted',
			'Pending',
			directDebit('Processing', 'NotSubmitted'),
		],
		[
			'Direct Debit submitted to the bank',
			'Pending',
			directDebit('Processed', 'Submitted'),
		],
		['settled Direct Debit', 'Settled', directDebit('Processed', 'Settled')],
		[
			'Direct Debit that failed to settle',
			'Failed',
			directDebit('Processed', 'FailedToSettle'),
		],
		[
			'Direct Debit that was never collected',
			'Failed',
			directDebit('Error', 'NotSubmitted'),
		],
	])('%s ⇒ %s', (_, expected, payment) => {
		expect(settlement(payment)).toBe(expected);
	});

	it('throws for a payment status it does not understand', () => {
		expect(() => settlement(card('Draft'))).toThrow(
			'Unexpected payment status Draft',
		);
	});

	it('throws for a Direct Debit gateway state it does not understand', () => {
		expect(() => settlement(directDebit('Processed', 'NotSubmitted'))).toThrow(
			'Unexpected gateway state NotSubmitted for a processed Direct Debit payment',
		);
	});
});
