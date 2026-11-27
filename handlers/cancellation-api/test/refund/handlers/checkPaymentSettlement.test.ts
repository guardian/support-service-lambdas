import { subscriptionNumberSchema } from '@modules/zuora/identifiers';
import {
	disableInvoiceAutoPay,
	getInvoice,
	getInvoiceItems,
} from '@modules/zuora/invoice';
import type { GetInvoiceItemsResponse } from '@modules/zuora/types';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { checkPaymentSettlement } from '../../../src/refund/handlers/checkPaymentSettlement';
import { PermanentError } from '../../../src/refund/permanentError';
import { subscriptionInvoiceItemSchema } from '../../../src/refund/subscriptionInvoiceItem';
import { getLatestInvoicePayment } from '../../../src/refund/zuora/invoicePayment';
import { getSubscriptionInvoiceItems } from '../../../src/refund/zuora/subscriptionInvoiceItems';

jest.mock('@modules/zuora/invoice');
jest.mock('../../../src/refund/zuora/invoicePayment');
jest.mock('../../../src/refund/zuora/subscriptionInvoiceItems');

const zuoraClient = {} as ZuoraClient;
const subscriptionNumber = subscriptionNumberSchema.parse('A-S00123456');

const subscriptionItem = (InvoiceId: string, ChargeAmount: number) =>
	subscriptionInvoiceItemSchema.parse({
		Id: `${InvoiceId}-item`,
		InvoiceId,
		ChargeDate: '2026-11-01T00:00:00.000Z',
		ChargeAmount,
		TaxAmount: 0,
	});

const mockInvoiceItems = (sharedInvoiceId?: string) =>
	jest.mocked(getInvoiceItems).mockImplementation((_, invoiceId) =>
		Promise.resolve({
			invoiceItems: [
				{ id: `${invoiceId}-item` },
				...(invoiceId === sharedInvoiceId ? [{ id: 'other-item' }] : []),
			],
		} as GetInvoiceItemsResponse),
	);

describe('checkPaymentSettlement', () => {
	beforeEach(() => {
		jest.resetAllMocks();
		jest
			.mocked(getSubscriptionInvoiceItems)
			.mockResolvedValue([
				subscriptionItem('paid', 12),
				subscriptionItem('negative', -12),
			]);
		mockInvoiceItems();
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

	const refundDue = {
		subscriptionNumber,
		paidInvoiceId: 'paid',
		negativeInvoiceId: 'negative',
	};

	it('checks the paid invoice when a refund is due', async () => {
		expect(await checkPaymentSettlement(zuoraClient, refundDue)).toEqual({
			invoiceId: 'paid',
			status: 'Pending',
			paymentId: 'payment-1',
			paymentAmount: 12,
		});
		expect(getLatestInvoicePayment).toHaveBeenCalledWith(zuoraClient, 'paid');
	});

	it('turns off AutoPay on the invoice before reading its payment', async () => {
		await checkPaymentSettlement(zuoraClient, refundDue);

		expect(disableInvoiceAutoPay).toHaveBeenCalledWith(zuoraClient, 'paid');
		expect(
			jest.mocked(disableInvoiceAutoPay).mock.invocationCallOrder[0],
		).toBeLessThan(
			jest.mocked(getLatestInvoicePayment).mock.invocationCallOrder[0]!,
		);
	});

	it('checks the latest positive invoice when no refund is due', async () => {
		jest
			.mocked(getSubscriptionInvoiceItems)
			.mockResolvedValue([subscriptionItem('current', 12)]);

		expect(
			await checkPaymentSettlement(zuoraClient, { subscriptionNumber }),
		).toEqual({
			invoiceId: 'current',
			status: 'Pending',
			paymentId: 'payment-1',
			paymentAmount: 12,
		});
	});

	it.each(['paid', 'negative'])(
		'fails without turning off AutoPay when the %s invoice has another subscription’s items',
		async (sharedInvoiceId) => {
			mockInvoiceItems(sharedInvoiceId);

			await expect(
				checkPaymentSettlement(zuoraClient, refundDue),
			).rejects.toBeInstanceOf(PermanentError);
			expect(disableInvoiceAutoPay).not.toHaveBeenCalled();
		},
	);
});
