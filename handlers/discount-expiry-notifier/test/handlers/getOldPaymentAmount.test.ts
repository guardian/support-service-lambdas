import { getLastPaymentDateBeforeDiscountExpiry } from '../../src/handlers/getOldPaymentAmount';

describe('getLastPaymentDateBeforeDiscountExpiry', () => {
	test('should return the date one year before for annual frequency', () => {
		const result = getLastPaymentDateBeforeDiscountExpiry(
			'2025-03-04',
			'annual',
		);

		expect(result).toBe('2024-03-04');
	});

	test('should return the date three months before for quarter frequency', () => {
		const result = getLastPaymentDateBeforeDiscountExpiry(
			'2025-03-04',
			'quarter',
		);
		expect(result).toBe('2024-12-04');
	});

	test('should return the date one month before for month frequency', () => {
		const result = getLastPaymentDateBeforeDiscountExpiry(
			'2025-03-04',
			'month',
		);
		expect(result).toBe('2025-02-04');
	});

	test('should handle leap year correctly for annual frequency', () => {
		const result = getLastPaymentDateBeforeDiscountExpiry(
			'2024-02-29',
			'annual',
		);
		expect(result).toBe('2023-02-28');
	});

	test('should throw an error for invalid payment frequency', () => {
		expect(() => {
			getLastPaymentDateBeforeDiscountExpiry('2025-03-04', 'weekly');
		}).toThrow('Invalid payment frequency');
	});
});
