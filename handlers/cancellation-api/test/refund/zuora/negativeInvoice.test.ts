import dayjs from 'dayjs';
import { subscriptionNumberSchema } from '@modules/zuora/identifiers';
import { getSubscription } from '@modules/zuora/subscription';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import {
	generateInvoice,
	getInvoiceStatus,
	postInvoice,
} from '../../../src/refund/zuora/invoiceGeneration';
import { generateAndPostNegativeInvoice } from '../../../src/refund/zuora/negativeInvoice';
import { getSubscriptionInvoiceItems } from '../../../src/refund/zuora/subscriptionInvoiceItems';

jest.mock('@modules/zuora/subscription');
jest.mock('../../../src/refund/zuora/invoiceGeneration');
jest.mock('../../../src/refund/zuora/subscriptionInvoiceItems');

const zuoraClient = {} as ZuoraClient;
const today = dayjs('2026-11-19');
const input = {
	subscriptionNumber: subscriptionNumberSchema.parse('A-S00123456'),
	targetDate: dayjs('2026-11-18'),
	today,
};

const invoiceItem = (InvoiceId: string, ChargeAmount: number) => ({
	Id: `${InvoiceId}-item`,
	InvoiceId,
	ChargeDate: '2026-11-18T10:00:00.000+00:00',
	ChargeAmount,
	TaxAmount: 0,
});

describe('generateAndPostNegativeInvoice', () => {
	beforeEach(() => {
		jest.resetAllMocks();
		jest.mocked(getSubscription).mockResolvedValue({ accountId: 'account-1' });
		jest
			.mocked(getSubscriptionInvoiceItems)
			.mockResolvedValue([
				invoiceItem('paid', 10),
				invoiceItem('negative', -10),
			]);
	});

	it('generates the invoice dated today, billed to the target date, and posts it', async () => {
		jest.mocked(generateInvoice).mockResolvedValue('negative');
		jest.mocked(getInvoiceStatus).mockResolvedValue('Draft');

		expect(await generateAndPostNegativeInvoice(zuoraClient, input)).toEqual(
			'negative',
		);
		expect(generateInvoice).toHaveBeenCalledWith(zuoraClient, {
			accountId: 'account-1',
			invoiceDate: today,
			targetDate: dayjs('2026-11-18'),
		});
		expect(postInvoice).toHaveBeenCalledWith(zuoraClient, 'negative');
	});

	it('returns the existing negative invoice on a re-run, without posting it again', async () => {
		jest.mocked(generateInvoice).mockResolvedValue(undefined);
		jest.mocked(getInvoiceStatus).mockResolvedValue('Posted');

		expect(await generateAndPostNegativeInvoice(zuoraClient, input)).toEqual(
			'negative',
		);
		expect(postInvoice).not.toHaveBeenCalled();
	});

	it('fails if the generated invoice is not the latest negative invoice', async () => {
		jest.mocked(generateInvoice).mockResolvedValue('paid');

		await expect(
			generateAndPostNegativeInvoice(zuoraClient, input),
		).rejects.toThrow(
			'Generated invoice paid is not the latest negative invoice negative',
		);
		expect(postInvoice).not.toHaveBeenCalled();
	});
});
