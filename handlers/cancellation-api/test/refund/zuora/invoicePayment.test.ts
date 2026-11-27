import { doQuery } from '@modules/zuora/query';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { PermanentError } from '../../../src/refund/permanentError';
import { getLatestInvoicePayment } from '../../../src/refund/zuora/invoicePayment';

jest.mock('@modules/zuora/query');

const get = jest.fn();
const zuoraClient = { get } as unknown as ZuoraClient;

describe('getLatestInvoicePayment', () => {
	beforeEach(() => {
		jest.resetAllMocks();
	});

	it('returns the most recently applied payment with its payment method type', async () => {
		jest.mocked(doQuery).mockResolvedValue({
			done: true,
			records: [
				{
					PaymentId: 'failed',
					Amount: 12,
					CreatedDate: '2026-11-01T10:00:00.000+00:00',
				},
				{
					PaymentId: 'retry',
					Amount: 12,
					CreatedDate: '2026-11-05T10:00:00.000+00:00',
				},
				{
					PaymentId: 'older',
					Amount: 12,
					CreatedDate: '2026-10-01T10:00:00.000+00:00',
				},
			],
		});
		get.mockImplementation((path: string) =>
			Promise.resolve(
				path === '/v1/object/payment/retry'
					? {
							Id: 'retry',
							Status: 'Processed',
							GatewayState: 'Submitted',
							PaymentMethodId: 'pm-1',
						}
					: { Type: 'BankTransfer' },
			),
		);

		expect(await getLatestInvoicePayment(zuoraClient, 'invoice-1')).toEqual({
			id: 'retry',
			amount: 12,
			status: 'Processed',
			gatewayState: 'Submitted',
			paymentMethodType: 'BankTransfer',
		});
		expect(get).toHaveBeenCalledWith(
			'/v1/object/payment-method/pm-1',
			expect.anything(),
		);
	});

	it('returns the amount applied to the invoice, not the whole payment', async () => {
		jest.mocked(doQuery).mockResolvedValue({
			done: true,
			records: [
				{
					PaymentId: 'split',
					Amount: 10,
					CreatedDate: '2026-11-05T10:00:00.000+00:00',
				},
			],
		});
		get.mockImplementation((path: string) =>
			Promise.resolve(
				path === '/v1/object/payment/split'
					? {
							Id: 'split',
							Amount: 20,
							Status: 'Processed',
							GatewayState: 'Settled',
							PaymentMethodId: 'pm-1',
						}
					: { Type: 'BankTransfer' },
			),
		);

		expect(await getLatestInvoicePayment(zuoraClient, 'invoice-1')).toEqual(
			expect.objectContaining({ id: 'split', amount: 10 }),
		);
	});

	it('returns undefined if the invoice has no payments', async () => {
		jest.mocked(doQuery).mockResolvedValue({ done: true, records: [] });

		expect(
			await getLatestInvoicePayment(zuoraClient, 'invoice-1'),
		).toBeUndefined();
		expect(get).not.toHaveBeenCalled();
	});

	it('fails permanently without fetching a payment if there are more payments than one page', async () => {
		jest.mocked(doQuery).mockResolvedValue({
			done: false,
			records: [
				{
					PaymentId: 'older',
					Amount: 12,
					CreatedDate: '2026-10-01T10:00:00.000+00:00',
				},
			],
		});

		await expect(
			getLatestInvoicePayment(zuoraClient, 'invoice-1'),
		).rejects.toThrow(
			new PermanentError('Too many payments for invoice invoice-1'),
		);
		expect(get).not.toHaveBeenCalled();
	});
});
