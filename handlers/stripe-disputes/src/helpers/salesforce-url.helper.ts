export const getSalesForceApiBaseUrl = (isSandbox: boolean): string => {
	return isSandbox
		? 'https://gnmtouchpoint--dev1.sandbox.my.salesforce.com'
		: ' https://gnmtouchpoint.my.salesforce.com';
};
