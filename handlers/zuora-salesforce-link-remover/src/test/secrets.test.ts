import { getSalesforceSecretNames } from "../secrets";

describe('getSalesforceSecretNames', () => {
	beforeEach(() => {
		jest.resetAllMocks();
		console.error = jest.fn();
	});

	test('should get CODE Salesforce secret names', () => {
		const actual = getSalesforceSecretNames('CODE');
		const expected = {
            apiUserSecretName: 'DEV/Salesforce/User/integrationapiuser',
            connectedAppSecretName:
                'DEV/Salesforce/ConnectedApp/AwsConnectorSandbox',
        };

		expect(actual).toEqual(expected);
	});

	test('should get PROD Salesforce secret names', () => {
		const actual = getSalesforceSecretNames('PROD');
		const expected = {
            apiUserSecretName: 'PROD/Salesforce/User/BillingAccountRemoverAPIUser',
            connectedAppSecretName:
                'PROD/Salesforce/ConnectedApp/AwsConnectorSandbox',
        };

		expect(actual).toEqual(expected);
	});
});

describe('getZuoraSecretName', () => {
	beforeEach(() => {
		jest.resetAllMocks();
		console.error = jest.fn();
	});

	test('should get CODE Zuora secret name', () => {
		const actual = getSalesforceSecretNames('CODE');
		const expected = 'CODE/Zuora-OAuth/SupportServiceLambdas';

		expect(actual).toEqual(expected);
	});

	test('should get PROD Zuora secret name', () => {
		const actual = getSalesforceSecretNames('PROD');
		const expected = 'PROD/Zuora/SupportServiceLambdas';

		expect(actual).toEqual(expected);
	});
});
