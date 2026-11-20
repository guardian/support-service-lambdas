import { subscriptionNumberSchema } from '@modules/zuora/identifiers';
import { getInvoice } from '@modules/zuora/invoice';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { checkPaymentSettlement } from '../../../src/refund/handlers/checkPaymentSettlement';
import { subscriptionInvoiceItemSchema } from '../../../src/refund/subscriptionInvoiceItem';
import { getLatestInvoicePayment } from '../../../src/refund/zuora/invoicePayment';
import { getSubscriptionInvoiceItems } from '../../../src/refund/zuora/subscriptionInvoiceItems';

jest.mock('@modules/zuora/invoice');
jest.mock('../../../src/refund/zuora/invoicePayment');
jest.mock('../../../src/refund/zuora/subscriptionInvoiceItems');

const zuoraClient = {} as ZuoraClient;
const subscriptionNumber = subscriptionNumberSchema.parse('A-S00123456');

describe('checkPaymentSettlement', () => {
	beforeEach(() => {
		jest.resetAllMocks();
		jest.mocked(getInvoice).mockResolvedValue({
			id: 'invoice',
			amount: 12,
			amountWithoutTax: 10,
			balance: 0,
			accountId: 'account-1',
		});
		jest.mocked(getLatestInvoicePayment).mockResolvedValue({
			id: 'payment-1',
			amount: 12,
			status: 'Processed',
			gatewayState: 'Submitted',
			paymentMethodType: 'BankTransfer',
		});
	});

	it('checks the paid invoice when a refund is due', async () => {
		expect(
			await checkPaymentSettlement(zuoraClient, {
				subscriptionNumber,
				paidInvoiceId: 'paid',
			}),
		).toEqual({
			invoiceId: 'paid',
			status: 'Pending',
			paymentId: 'payment-1',
			paymentAmount: 12,
		});
		expect(getSubscriptionInvoiceItems).not.toHaveBeenCalled();
		expect(getLatestInvoicePayment).toHaveBeenCalledWith(zuoraClient, 'paid');
	});

	it('checks the latest positive invoice when no refund is due', async () => {
		jest.mocked(getSubscriptionInvoiceItems).mockResolvedValue([
			subscriptionInvoiceItemSchema.parse({
				Id: 'item-1',
				InvoiceId: 'current',
				ChargeDate: '2026-11-01T00:00:00.000Z',
				ChargeAmount: 10,
				TaxAmount: 2,
			}),
		]);

		expect(
			await checkPaymentSettlement(zuoraClient, { subscriptionNumber }),
		).toEqual({
			invoiceId: 'current',
			status: 'Pending',
			paymentId: 'payment-1',
			paymentAmount: 12,
		});
	});
});
