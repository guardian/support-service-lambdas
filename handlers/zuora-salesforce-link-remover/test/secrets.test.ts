import { getSalesforceConnectedAppSecretName } from '../src/salesforceSecretNames';

describe('getSalesforceConnectedAppSecretName', () => {
	test.each([
		['CODE', 'CODE/Salesforce/ConnectedApp/BillingAccountRemover'],
		['PROD', 'PROD/Salesforce/ConnectedApp/BillingAccountRemover'],
	] as const)('returns the %s connected app secret name', (stage, expected) => {
		expect(getSalesforceConnectedAppSecretName(stage)).toEqual(expected);
	});
});
