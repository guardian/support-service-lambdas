/**
 * @group unit
 */

import { isValidSalesforceContactId } from '../src/salesforceService';

describe('isValidSalesforceContactId', () => {
	it('should return true for valid 15-character Salesforce ID', () => {
		expect(isValidSalesforceContactId('0030J000020wMWp')).toBe(true);
	});

	it('should return true for valid 18-character Salesforce ID', () => {
		expect(isValidSalesforceContactId('0030J000020wMWpQAM')).toBe(true);
	});

	it('should return false for too short ID', () => {
		expect(isValidSalesforceContactId('0030J000020')).toBe(false);
	});

	it('should return false for too long ID', () => {
		expect(isValidSalesforceContactId('0030J000020wMWpQAMXXX')).toBe(false);
	});

	it('should return false for ID with invalid characters', () => {
		expect(isValidSalesforceContactId('0030J000020wMW!')).toBe(false);
	});

	it('should return false for empty string', () => {
		expect(isValidSalesforceContactId('')).toBe(false);
	});

	it('should return true for IDs with both uppercase and lowercase letters', () => {
		expect(isValidSalesforceContactId('0030j000020wmwp')).toBe(true);
		expect(isValidSalesforceContactId('0030J000020WMWP')).toBe(true);
	});
});
