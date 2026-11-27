import { subscriptionNumberSchema } from '@modules/zuora/identifiers';
import { doQuery } from '@modules/zuora/query';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { PermanentError } from '../../../src/refund/permanentError';
import { getSubscriptionInvoiceItems } from '../../../src/refund/zuora/subscriptionInvoiceItems';

jest.mock('@modules/zuora/query');

const zuoraClient = {} as ZuoraClient;
const subscriptionNumber = subscriptionNumberSchema.parse('A-S00123456');

const record = (ChargeAmount: number, TaxAmount: number) => ({
	Id: 'item-1',
	InvoiceId: 'invoice-1',
	ChargeDate: '2026-11-01T00:00:00.000Z',
	ChargeAmount,
	TaxAmount,
});

describe('getSubscriptionInvoiceItems', () => {
	beforeEach(() => {
		jest.resetAllMocks();
	});

	it('returns the amounts in pence', async () => {
		jest
			.mocked(doQuery)
			.mockResolvedValue({ done: true, records: [record(10.99, 2.2)] });

		expect(
			await getSubscriptionInvoiceItems(zuoraClient, subscriptionNumber),
		).toEqual([{ ...record(1099, 220) }]);
	});

	it('fails permanently if there are more items than one page', async () => {
		jest
			.mocked(doQuery)
			.mockResolvedValue({ done: false, records: [record(10, 2)] });

		await expect(
			getSubscriptionInvoiceItems(zuoraClient, subscriptionNumber),
		).rejects.toThrow(
			new PermanentError('Too many invoice items for subscription A-S00123456'),
		);
	});

	it('fails permanently on a fraction of a penny', async () => {
		jest
			.mocked(doQuery)
			.mockResolvedValue({ done: true, records: [record(0.001, 0)] });

		await expect(
			getSubscriptionInvoiceItems(zuoraClient, subscriptionNumber),
		).rejects.toThrow(
			new PermanentError('0.001 is not a whole number of pence'),
		);
	});
});
