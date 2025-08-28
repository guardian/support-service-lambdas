import { getSalesForceApiBaseUrl } from '../../src/helpers/salesforce-url.helper';

describe('getSalesForceApiBaseUrl', () => {
	it('should return sandbox URL when isSandbox is true', () => {
		const result = getSalesForceApiBaseUrl(true);
		expect(result).toBe(
			'https://gnmtouchpoint--dev1.sandbox.my.salesforce.com',
		);
	});

	it('should return production URL when isSandbox is false', () => {
		const result = getSalesForceApiBaseUrl(false);
		expect(result).toBe(' https://gnmtouchpoint.my.salesforce.com');
	});
});
