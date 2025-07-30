import { calculateTotalAmount, filterRecords } from '../src/helpers';
import type { BillingPreviewInvoiceItem } from '../../../modules/zuora/src/types/objects/billingPreview';

describe('calculateTotalAmount', () => {
	test('should return the total amount for given invoice items', () => {
		const invoiceItems: BillingPreviewInvoiceItem[] = [
			{
				id: '1',
				subscriptionNumber: 'A-S12345678',
				serviceStartDate: new Date('2025-01-01'),
				chargeName: 'GW Oct 18 - Quarterly - Domestic',
				chargeAmount: 100,
				taxAmount: 10,
			},
			{
				id: '2',
				subscriptionNumber: 'A-S12345678',
				serviceStartDate: new Date('2025-01-01'),
				chargeName: 'GW Oct 18 - Quarterly - Domestic',
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
				chargeName: 'GW Oct 18 - Quarterly - Domestic',
				chargeAmount: 0,
				taxAmount: 0,
			},
			{
				id: '2',
				subscriptionNumber: 'A-S12345678',
				serviceStartDate: new Date('2025-01-01'),
				chargeName: 'GW Oct 18 - Quarterly - Domestic',
				chargeAmount: 0,
				taxAmount: 0,
			},
		];

		const result = calculateTotalAmount(invoiceItems);
		expect(result).toBe(0);
	});
});

describe('filterRecords', () => {
	test('should return records that match the given subscription number and date', () => {
		const records: BillingPreviewInvoiceItem[] = [
			{
				id: '1',
				subscriptionNumber: 'A-S12345678',
				serviceStartDate: new Date('2025-01-01'),
				chargeName: 'GW Oct 18 - Quarterly - Domestic',
				chargeAmount: 100,
				taxAmount: 10,
			},
			{
				id: '2',
				subscriptionNumber: 'A-S12345678',
				serviceStartDate: new Date('2025-01-02'),
				chargeName: 'GW Oct 18 - Quarterly - Domestic',
				chargeAmount: 200,
				taxAmount: 20,
			},
			{
				id: '3',
				subscriptionNumber: 'A-S87654321',
				serviceStartDate: new Date('2025-01-01'),
				chargeName: 'GW Oct 18 - Quarterly - Domestic',
				chargeAmount: 300,
				taxAmount: 30,
			},
		];

		const result = filterRecords(records, 'A-S12345678', '2025-01-01');
		expect(result).toEqual([
			{
				id: '1',
				subscriptionNumber: 'A-S12345678',
				serviceStartDate: new Date('2025-01-01'),
				chargeName: 'GW Oct 18 - Quarterly - Domestic',
				chargeAmount: 100,
				taxAmount: 10,
			},
		]);
	});

	test('should return an empty array if no records match the given subscription number and date', () => {
		const records: BillingPreviewInvoiceItem[] = [
			{
				id: '1',
				subscriptionNumber: 'A-S12345678',
				serviceStartDate: new Date('2025-01-01'),
				chargeName: 'GW Oct 18 - Quarterly - Domestic',
				chargeAmount: 100,
				taxAmount: 10,
			},
			{
				id: '2',
				subscriptionNumber: 'A-S12345678',
				serviceStartDate: new Date('2025-01-02'),
				chargeName: 'GW Oct 18 - Quarterly - Domestic',
				chargeAmount: 200,
				taxAmount: 20,
			},
			{
				id: '3',
				subscriptionNumber: 'A-S87654321',
				serviceStartDate: new Date('2025-01-01'),
				chargeName: 'GW Oct 18 - Quarterly - Domestic',
				chargeAmount: 300,
				taxAmount: 30,
			},
		];

		const result = filterRecords(records, 'A-S00000000', '2025-01-01');
		expect(result).toEqual([]);
	});

	test('should handle an empty array of records', () => {
		const records: BillingPreviewInvoiceItem[] = [];

		const result = filterRecords(records, 'A-S12345678', '2025-01-01');
		expect(result).toEqual([]);
	});
});
