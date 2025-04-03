import { getIneligibilityReason } from "../../src/handlers/sendEmail";

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