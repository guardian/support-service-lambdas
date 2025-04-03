import { formatDate, getCurrencySymbol, getEmailSendEligibility, getIneligibilityReason } from "../../src/handlers/sendEmail";

describe('getIneligibilityReason', () => {
    it('should return "Subscription status is cancelled" when subStatus is "Cancelled"', () => {
        const result = getIneligibilityReason('Cancelled', 'test@example.com', 100, 200);
        expect(result).toBe('Subscription status is cancelled');
    });

    it('should return "Error getting sub status from Zuora" when subStatus is "Error"', () => {
        const result = getIneligibilityReason('Error', 'test@example.com', 100, 200);
        expect(result).toBe('Error getting sub status from Zuora');
    });

    it('should return "No value for work email" when workEmail is null', () => {
        const result = getIneligibilityReason('Active', null, 100, 200);
        expect(result).toBe('No value for work email');
    });

    it('should return "No value for work email" when workEmail is undefined', () => {
        const result = getIneligibilityReason('Active', undefined, 100, 200);
        expect(result).toBe('No value for work email');
    });

    it('should return "Old and new payment amounts are the same" when oldPaymentAmount equals newPaymentAmount', () => {
        const result = getIneligibilityReason('Active', 'test@example.com', 100, 100);
        expect(result).toBe('Old and new payment amounts are the same');
    });

    it('should return an empty string when all conditions are met', () => {
        const result = getIneligibilityReason('Active', 'test@example.com', 100, 200);
        expect(result).toBe('');
    });
});

describe('getEmailSendEligibility', () => {
	it('should return isEligible as false and correct ineligibilityReason when subStatus is "Cancelled"', () => {
		const result = getEmailSendEligibility('Cancelled', 'test@example.com', 100, 200);
		expect(result).toEqual({
			isEligible: false,
			ineligibilityReason: 'Subscription status is cancelled',
		});
	});

	it('should return isEligible as false and correct ineligibilityReason when subStatus is "Error"', () => {
		const result = getEmailSendEligibility('Error', 'test@example.com', 100, 200);
		expect(result).toEqual({
			isEligible: false,
			ineligibilityReason: 'Error getting sub status from Zuora',
		});
	});

	it('should return isEligible as false and correct ineligibilityReason when workEmail is null', () => {
		const result = getEmailSendEligibility('Active', null, 100, 200);
		expect(result).toEqual({
			isEligible: false,
			ineligibilityReason: 'No value for work email',
		});
	});

	it('should return isEligible as false and correct ineligibilityReason when workEmail is undefined', () => {
		const result = getEmailSendEligibility('Active', undefined, 100, 200);
		expect(result).toEqual({
			isEligible: false,
			ineligibilityReason: 'No value for work email',
		});
	});

	it('should return isEligible as false and correct ineligibilityReason when oldPaymentAmount equals newPaymentAmount', () => {
		const result = getEmailSendEligibility('Active', 'test@example.com', 100, 100);
		expect(result).toEqual({
			isEligible: false,
			ineligibilityReason: 'Old and new payment amounts are the same',
		});
	});

	it('should return isEligible as true and an empty ineligibilityReason when all conditions are met', () => {
		const result = getEmailSendEligibility('Active', 'test@example.com', 100, 200);
		expect(result).toEqual({
			isEligible: true,
			ineligibilityReason: '',
		});
	});
});

describe('formatDate', () => {
    it('should format a valid date string to "DD Month YYYY" format', () => {
        const result = formatDate('2023-10-15');
        expect(result).toBe('15 October 2023');
    });

    it('should handle a date string with time and format it correctly', () => {
        const result = formatDate('2023-10-15T14:30:00Z');
        expect(result).toBe('15 October 2023');
    });

    it('should throw an error for an invalid date string', () => {
        expect(() => formatDate('invalid-date')).toThrow();
    });

    it('should handle edge cases like leap years correctly', () => {
        const result = formatDate('2024-02-29');
        expect(result).toBe('29 February 2024');
    });

    it('should handle single-digit months and days correctly', () => {
        const result = formatDate('2023-01-05');
        expect(result).toBe('05 January 2023');
    });
});

describe('getCurrencySymbol', () => {
    it('should return "£" for GBP', () => {
        const result = getCurrencySymbol('GBP');
        expect(result).toBe('£');
    });

    it('should return "$" for USD', () => {
        const result = getCurrencySymbol('USD');
        expect(result).toBe('$');
    });

    it('should return "€" for EUR', () => {
        const result = getCurrencySymbol('EUR');
        expect(result).toBe('€');
    });

    it('should return "$" for AUD', () => {
        const result = getCurrencySymbol('AUD');
        expect(result).toBe('$');
    });

    it('should return "$" for CAD', () => {
        const result = getCurrencySymbol('CAD');
        expect(result).toBe('$');
    });

    it('should return "$" for NZD', () => {
        const result = getCurrencySymbol('NZD');
        expect(result).toBe('$');
    });

    it('should return an empty string for an unsupported currency code', () => {
        const result = getCurrencySymbol('XYZ');
        expect(result).toBe('');
    });

    it('should return an empty string for an empty currency code', () => {
        const result = getCurrencySymbol('');
        expect(result).toBe('');
    });
});