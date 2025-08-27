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

		it('should throw error for invalid timestamp that results in undefined date', () => {
			// Mock toISOString to return empty string to trigger undefined from split
			const originalDate = global.Date;
			global.Date = class extends originalDate {
				toISOString() {
					return '';
				}
			} as any;

			expect(() => timestampToSalesforceDate(1640995200)).toThrow(
				'Invalid timestamp: 1640995200',
			);

			// Restore original Date
			global.Date = originalDate;
		});
	});
});
