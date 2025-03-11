import { getBillingPreview } from '@modules/zuora/billingPreview';
import { doQuery } from '@modules/zuora/query';
import type { BillingPreviewInvoiceItem } from '@modules/zuora/zuoraSchemas';
import { mockZuoraClient } from '../../../../modules/zuora/test/mocks/mockZuoraClient';
import {
	calculateTotalAmount,
	getFutureInvoiceItems,
	getPastInvoiceItems,
} from '../../src/handlers/getOldPaymentAmount';

jest.mock('@modules/zuora/query');
jest.mock('@modules/zuora/billingPreview');

describe('getFutureInvoiceItems', () => {
	beforeEach(() => {
		jest.resetAllMocks();
	});

	test('should return records for a given subscription and target date', async () => {
		const mockBillingPreviewResponse = {
			accountId: '8ad0823f800415d501801dd4b73b3c61',
			invoiceItems: [],
		};
		(getBillingPreview as jest.Mock).mockResolvedValue(
			mockBillingPreviewResponse,
		);

		const result = await getFutureInvoiceItems(
			mockZuoraClient,
			'A-S00348201',
			'A00112233',
			'2025-03-12',
		);

		expect(result).toEqual([]);
	});

	test('should return records for a given subscription and target date', async () => {
		const mockBillingPreviewResponse = {
			accountId: '8ad0823f800415d501801dd4b73b3c61',
			invoiceItems: [
				{
					id: 'b932148ca2424f59b7f860c9200c2fa0',
					subscriptionNumber: 'A-S00348201',
					serviceStartDate: '2025-03-12T00:00:00.000Z',
					chargeAmount: 7.18,
					taxAmount: 0,
				},
			],
		};
		(getBillingPreview as jest.Mock).mockResolvedValue(
			mockBillingPreviewResponse,
		);

		const result = await getFutureInvoiceItems(
			mockZuoraClient,
			'A-S00348201',
			'A00112233',
			'2025-03-12',
		);

		expect(result).toEqual([
			{
				id: 'b932148ca2424f59b7f860c9200c2fa0',
				subscriptionNumber: 'A-S00348201',
				serviceStartDate: '2025-03-12T00:00:00.000Z',
				chargeAmount: 7.18,
				taxAmount: 0,
			},
		]);
	});
});

describe('getPastInvoiceItems', () => {
	beforeEach(() => {
		jest.resetAllMocks();
	});

	test('should return records for a given subscription and target date', async () => {
		const records = [{}, {}];
		(doQuery as jest.Mock).mockResolvedValue({ records });

		const result = await getPastInvoiceItems(
			mockZuoraClient,
			'A-S12345678',
			'2022-01-01',
		);

		expect(result).toEqual(records);
	});

	test('should return records for a given subscription and target date', async () => {
		const records = [
			{
				ChargeAmount: 100,
				TaxAmount: 10,
				ServiceStartDate: '2022-01-01',
				SubscriptionNumber: 'A-S12345678',
			},
			{
				ChargeAmount: 200,
				TaxAmount: 20,
				ServiceStartDate: '2022-01-01',
				SubscriptionNumber: 'A-S12345678',
			},
		];
		(doQuery as jest.Mock).mockResolvedValue({ records });

		const result = await getPastInvoiceItems(
			mockZuoraClient,
			'A-S12345678',
			'2022-01-01',
		);

		expect(result).toEqual(records);
	});

	test('should return an empty array if no records are found', async () => {
		const records: unknown[] = [];
		(doQuery as jest.Mock).mockResolvedValue({ records });

		const result = await getPastInvoiceItems(
			mockZuoraClient,
			'A-S12345678',
			'2022-01-01',
		);

		expect(result).toEqual(records);
	});
});

describe('calculateTotalAmount', () => {
	test('should return the total amount for given invoice items', () => {
		const invoiceItems: BillingPreviewInvoiceItem[] = [
			{
				id: '1',
				subscriptionNumber: 'A-S12345678',
				serviceStartDate: new Date('2025-01-01'),
				chargeAmount: 100,
				taxAmount: 10,
			},
			{
				id: '2',
				subscriptionNumber: 'A-S12345678',
				serviceStartDate: new Date('2025-01-01'),
				chargeAmount: 200,
				taxAmount: 20,
			},
		];

		const result = calculateTotalAmount(invoiceItems);
		expect(result).toBe(330);
	});

	test('should return 0 if no invoice items are provided', () => {
		const invoiceItems: BillingPreviewInvoiceItem[] = [];

		const result = calculateTotalAmount(invoiceItems);
		expect(result).toBe(0);
	});

	test('should handle invoice items with zero amounts', () => {
		const invoiceItems: BillingPreviewInvoiceItem[] = [
			{
				id: '1',
				subscriptionNumber: 'A-S12345678',
				serviceStartDate: new Date('2025-01-01'),
				chargeAmount: 0,
				taxAmount: 0,
			},
			{
				id: '2',
				subscriptionNumber: 'A-S12345678',
				serviceStartDate: new Date('2025-01-01'),
				chargeAmount: 0,
				taxAmount: 0,
			},
		];

		const result = calculateTotalAmount(invoiceItems);
		expect(result).toBe(0);
	});
});
