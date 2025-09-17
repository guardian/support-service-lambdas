import { getBillingPreview } from '@modules/zuora/billingPreview';
import { doQuery } from '@modules/zuora/query';
import type { BillingPreviewInvoiceItem } from '@modules/zuora/types';
import { mockZuoraClient } from '../../../../modules/zuora/test/mocks/mockZuoraClient';
import type { QueryInvoiceItem } from '../../src/handlers/getOldPaymentAmount';
import {
	getFutureInvoiceItems,
	getPastInvoiceItems,
	transformZuoraResponseKeys,
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

describe('transformZuoraResponseKeys', () => {
	test('should transform Zuora response keys to BillingPreviewInvoiceItem format', () => {
		const queryInvoiceItems: QueryInvoiceItem[] = [
			{
				Id: '1',
				SubscriptionNumber: 'A-S12345678',
				ServiceStartDate: new Date('2025-01-01'),
				ChargeName: 'GW Oct 18 - Quarterly - Domestic',
				ChargeAmount: 100,
				TaxAmount: 10,
			},
			{
				Id: '2',
				SubscriptionNumber: 'A-S12345678',
				ServiceStartDate: new Date('2025-01-01'),
				ChargeName: 'GW Oct 18 - Quarterly - Domestic',
				ChargeAmount: 200,
				TaxAmount: 20,
			},
		];

		const expectedBillingPreviewInvoiceItems: BillingPreviewInvoiceItem[] = [
			{
				subscriptionNumber: 'A-S12345678',
				serviceStartDate: new Date('2025-01-01'),
				chargeName: 'GW Oct 18 - Quarterly - Domestic',
				chargeAmount: 100,
				taxAmount: 10,
			},
			{
				subscriptionNumber: 'A-S12345678',
				serviceStartDate: new Date('2025-01-01'),
				chargeName: 'GW Oct 18 - Quarterly - Domestic',
				chargeAmount: 200,
				taxAmount: 20,
			},
		];

		const result = transformZuoraResponseKeys(queryInvoiceItems);
		expect(result).toEqual(expectedBillingPreviewInvoiceItems);
	});

	test('should handle an empty array', () => {
		const queryInvoiceItems: QueryInvoiceItem[] = [];

		const result = transformZuoraResponseKeys(queryInvoiceItems);
		expect(result).toEqual([]);
	});
});
