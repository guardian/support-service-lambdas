import dayjs from 'dayjs';
import {
	orderNumberSchema,
	subscriptionNumberSchema,
} from '@modules/zuora/identifiers';
import { getInvoiceItems } from '@modules/zuora/invoice';
import type { GetInvoiceItemsResponse } from '@modules/zuora/types';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { balanceInvoices } from '../../../src/refund/handlers/balanceInvoices';
import { PermanentError } from '../../../src/refund/permanentError';
import { subscriptionInvoiceItemSchema } from '../../../src/refund/subscriptionInvoiceItem';
import { getSubscriptionInvoiceItems } from '../../../src/refund/zuora/subscriptionInvoiceItems';
import { zeroInvoice } from '../../../src/refund/zuora/zeroInvoice';

jest.mock('@modules/zuora/invoice');
jest.mock('../../../src/refund/zuora/subscriptionInvoiceItems');
jest.mock('../../../src/refund/zuora/zeroInvoice');

const zuoraClient = {} as ZuoraClient;
const today = dayjs('2026-11-23');
const input = {
	subscriptionNumber: subscriptionNumberSchema.parse('A-S00123456'),
	cancellationOrderNumber: orderNumberSchema.parse('O-00012345'),
	paidInvoiceId: 'paid',
	negativeInvoiceId: 'negative',
};

const subscriptionItem = (InvoiceId: string) =>
	subscriptionInvoiceItemSchema.parse({
		Id: `${InvoiceId}-item`,
		InvoiceId,
		ChargeDate: '2026-11-01T10:00:00.000+00:00',
		ChargeAmount: 10,
		TaxAmount: 0,
	});

const invoiceItems = (...ids: string[]) =>
	({ invoiceItems: ids.map((id) => ({ id })) }) as GetInvoiceItemsResponse;

describe('balanceInvoices', () => {
	beforeEach(() => {
		jest.resetAllMocks();
		jest
			.mocked(getSubscriptionInvoiceItems)
			.mockResolvedValue([
				subscriptionItem('paid'),
				subscriptionItem('negative'),
			]);
	});

	it('zeroes the paid invoice then the negative invoice, commented with the refund key', async () => {
		jest
			.mocked(getInvoiceItems)
			.mockImplementation((_, invoiceId) =>
				Promise.resolve(invoiceItems(`${invoiceId}-item`)),
			);

		await balanceInvoices(zuoraClient, input, today);

		expect(jest.mocked(zeroInvoice).mock.calls).toEqual([
			[
				{
					zuoraClient,
					invoiceId: 'paid',
					adjustmentDate: today,
					comment: 'A-S00123456-O-00012345',
				},
			],
			[
				{
					zuoraClient,
					invoiceId: 'negative',
					adjustmentDate: today,
					comment: 'A-S00123456-O-00012345',
				},
			],
		]);
	});

	it.each(['paid', 'negative'])(
		'adjusts neither invoice when the %s invoice has another subscription’s items',
		async (sharedInvoiceId) => {
			jest
				.mocked(getInvoiceItems)
				.mockImplementation((_, invoiceId) =>
					Promise.resolve(
						invoiceId === sharedInvoiceId
							? invoiceItems(`${invoiceId}-item`, 'other-subscription-item')
							: invoiceItems(`${invoiceId}-item`),
					),
				);

			await expect(
				balanceInvoices(zuoraClient, input, today),
			).rejects.toBeInstanceOf(PermanentError);
			expect(zeroInvoice).not.toHaveBeenCalled();
		},
	);
});
