import {
	timestampToSalesforceDate,
	timestampToSalesforceDateTime,
} from '../../src/helpers/timestampHelper';

describe('Timestamp Helper', () => {
	describe('timestampToSalesforceDateTime', () => {
		it('should convert Unix timestamp to ISO datetime string', () => {
			const timestamp = 1640995200;
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
			const timestamp = 1640995200;
			const result = timestampToSalesforceDate(timestamp);

			expect(result).toBe('2022-01-01');
		});

		it('should handle timestamp 0', () => {
			const result = timestampToSalesforceDate(0);
			expect(result).toBe('1970-01-01');
		});

		it('should throw error for invalid timestamp that results in undefined date', () => {
			const originalDate = global.Date;
			global.Date = class extends originalDate {
				toISOString() {
					return '';
				}
			} as any;

			expect(() => timestampToSalesforceDate(1640995200)).toThrow(
				'Invalid timestamp: 1640995200',
			);

			global.Date = originalDate;
		});
	});
});
