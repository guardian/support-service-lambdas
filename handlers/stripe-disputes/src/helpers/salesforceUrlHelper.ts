/**
 * Gets the appropriate Salesforce API base URL based on environment
 *
 * @param isSandbox - Whether to use sandbox or production environment
 * @returns Salesforce API base URL
 */
export const getSalesForceApiBaseUrl = (isSandbox: boolean): string => {
	return isSandbox
		? 'https://gnmtouchpoint--dev1.sandbox.my.salesforce.com'
		: ' https://gnmtouchpoint.my.salesforce.com';
};
