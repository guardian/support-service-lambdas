import { subscriptionNumberSchema } from '@modules/zuora/identifiers';
import { doQuery } from '@modules/zuora/query';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { PermanentError } from '../../../src/refund/permanentError';
import { getInvoiceServiceStartDate } from '../../../src/refund/zuora/invoiceServiceStartDate';

jest.mock('@modules/zuora/query');

const zuoraClient = {} as ZuoraClient;
const subscriptionNumber = subscriptionNumberSchema.parse('A-S00123456');

describe('getInvoiceServiceStartDate', () => {
	beforeEach(() => {
		jest.resetAllMocks();
	});

	it('returns the earliest service start date', async () => {
		jest.mocked(doQuery).mockResolvedValue({
			done: true,
			records: [
				{ ServiceStartDate: '2026-11-01' },
				{ ServiceStartDate: '2026-10-01' },
				{ ServiceStartDate: '2026-12-01' },
			],
		});

		const date = await getInvoiceServiceStartDate(
			zuoraClient,
			subscriptionNumber,
			'invoice-1',
		);

		expect(date.format('YYYY-MM-DD')).toBe('2026-10-01');
	});

	it('fails permanently if the invoice has no items for the subscription', async () => {
		jest.mocked(doQuery).mockResolvedValue({ done: true, records: [] });

		await expect(
			getInvoiceServiceStartDate(zuoraClient, subscriptionNumber, 'invoice-1'),
		).rejects.toThrow(
			new PermanentError(
				'Invoice invoice-1 has no items for subscription A-S00123456',
			),
		);
	});

	it('fails permanently if there are more items than one page', async () => {
		jest.mocked(doQuery).mockResolvedValue({
			done: false,
			records: [{ ServiceStartDate: '2026-11-01' }],
		});

		await expect(
			getInvoiceServiceStartDate(zuoraClient, subscriptionNumber, 'invoice-1'),
		).rejects.toThrow(
			new PermanentError(
				'Too many items on invoice invoice-1 for subscription A-S00123456',
			),
		);
	});
});
