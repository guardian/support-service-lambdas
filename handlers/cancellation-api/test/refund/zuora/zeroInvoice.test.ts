import dayjs from 'dayjs';
import {
	creditInvoice,
	getInvoice,
	getInvoiceItems,
} from '@modules/zuora/invoice';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { zeroInvoice } from '../../../src/refund/zuora/zeroInvoice';

jest.mock('@modules/zuora/invoice');

const zuoraClient = {} as ZuoraClient;
const adjustmentDate = dayjs('2026-11-17');
const invoiceId = 'invoice-1';

const invoiceWithBalance = (balance: number) => ({
	id: invoiceId,
	amount: 12,
	amountWithoutTax: 10,
	balance,
	accountId: 'account-1',
});

describe('zeroInvoice', () => {
	beforeEach(() => {
		jest.resetAllMocks();
	});

	it('credits each item and tax line by its available amount', async () => {
		jest.mocked(getInvoice).mockResolvedValue(invoiceWithBalance(12));
		jest.mocked(getInvoiceItems).mockResolvedValue({
			invoiceItems: [
				{
					id: 'item-1',
					productRatePlanChargeId: 'charge-1',
					availableToCreditAmount: 10,
					taxationItems: {
						data: [{ id: 'tax-1', availableToCreditAmount: 2 }],
					},
				},
			],
		});

		await zeroInvoice({
			zuoraClient,
			invoiceId,
			adjustmentDate,
			comment: 'refund-key',
		});

		expect(jest.mocked(creditInvoice).mock.calls).toEqual([
			[
				adjustmentDate,
				zuoraClient,
				invoiceId,
				'item-1',
				10,
				'Credit',
				'InvoiceDetail',
				'refund-key',
			],
			[
				adjustmentDate,
				zuoraClient,
				invoiceId,
				'tax-1',
				2,
				'Credit',
				'Tax',
				'refund-key',
			],
		]);
	});

	it('finishes an interrupted run without repeating its adjustments', async () => {
		const item = (itemAvailable: number, taxAvailable: number) => ({
			invoiceItems: [
				{
					id: 'item-1',
					productRatePlanChargeId: 'charge-1',
					availableToCreditAmount: itemAvailable,
					taxationItems: {
						data: [{ id: 'tax-1', availableToCreditAmount: taxAvailable }],
					},
				},
			],
		});
		const input = {
			zuoraClient,
			invoiceId,
			adjustmentDate,
			comment: 'refund-key',
		};
		jest.mocked(getInvoice).mockResolvedValueOnce(invoiceWithBalance(12));
		jest.mocked(getInvoiceItems).mockResolvedValueOnce(item(10, 2));
		jest
			.mocked(creditInvoice)
			.mockResolvedValueOnce({ Success: true } as never)
			.mockRejectedValueOnce(new Error('Zuora unavailable'));

		await expect(zeroInvoice(input)).rejects.toThrow('Zuora unavailable');

		jest.mocked(getInvoice).mockResolvedValueOnce(invoiceWithBalance(2));
		jest.mocked(getInvoiceItems).mockResolvedValueOnce(item(0, 2));
		jest.mocked(creditInvoice).mockClear();

		await zeroInvoice(input);

		expect(jest.mocked(creditInvoice).mock.calls).toEqual([
			[
				adjustmentDate,
				zuoraClient,
				invoiceId,
				'tax-1',
				2,
				'Credit',
				'Tax',
				'refund-key',
			],
		]);
	});

	it('does nothing if the invoice already has a zero balance', async () => {
		jest.mocked(getInvoice).mockResolvedValue(invoiceWithBalance(0));

		await zeroInvoice({
			zuoraClient,
			invoiceId,
			adjustmentDate,
			comment: 'refund-key',
		});

		expect(getInvoiceItems).not.toHaveBeenCalled();
		expect(creditInvoice).not.toHaveBeenCalled();
	});
});
