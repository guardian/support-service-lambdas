import {
	timestampToSalesforceDate,
	timestampToSalesforceDateTime,
} from '../../src/helpers/timestamp.helper';

describe('Timestamp Helper', () => {
	describe('timestampToSalesforceDateTime', () => {
		it('should convert Unix timestamp to ISO datetime string', () => {
			const timestamp = 1640995200; // 2022-01-01T00:00:00.000Z
			const result = timestampToSalesforceDateTime(timestamp);

			expect(result).toBe('2022-01-01T00:00:00.000Z');
		});

		it('should handle timestamp 0', () => {
			const result = timestampToSalesforceDateTime(0);
			expect(result).toBe('1970-01-01T00:00:00.000Z');
		});
	});

	describe('timestampToSalesforceDate', () => {
		it('should convert Unix timestamp to ISO date string', () => {
			const timestamp = 1640995200; // 2022-01-01
			const result = timestampToSalesforceDate(timestamp);

			expect(result).toBe('2022-01-01');
		});

		it('should handle timestamp 0', () => {
			const result = timestampToSalesforceDate(0);
			expect(result).toBe('1970-01-01');
		});

		it('should handle edge case timestamps', () => {
			// Test with very large timestamp
			const result = timestampToSalesforceDate(2147483647); // Max 32-bit int
			expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		});
	});
});
