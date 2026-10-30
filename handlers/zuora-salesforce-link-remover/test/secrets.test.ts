import { getSalesforceConnectedAppSecretName } from '../src/salesforceSecretNames';

describe('getSalesforceConnectedAppSecretName', () => {
	beforeEach(() => {
		jest.resetAllMocks();
		console.error = jest.fn();
	});

	test('should get the CODE Salesforce connected app secret name', () => {
		const actual = getSalesforceConnectedAppSecretName('CODE');
		const expected = 'CODE/Salesforce/ConnectedApp/BillingAccountRemover';

		expect(actual).toEqual(expected);
	});

	test('should get the PROD Salesforce connected app secret name', () => {
		const actual = getSalesforceConnectedAppSecretName('PROD');
		const expected = 'PROD/Salesforce/ConnectedApp/BillingAccountRemover';

		expect(actual).toEqual(expected);
	});
});
