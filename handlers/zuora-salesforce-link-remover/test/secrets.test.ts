import {
	GetSecretValueCommand,
	SecretsManagerClient
} from '@aws-sdk/client-secrets-manager';
import { mockClient } from 'aws-sdk-client-mock';
import type { ConnectedAppSecret } from '../src/secrets';
import { getSecretValue } from '../src/secrets';

const secretsManagerClientMock = mockClient(SecretsManagerClient);

describe('getSecretValue', () => {

	const secretName = 'DEV/Salesforce/ConnectedApp/AwsConnectorSandbox';
	const secretValue = { 
		name:'AwsConnectorSandbox', 
		authUrl: 'https://test.salesforce.com/services/oauth2/token', 
		clientId: 'abc', 
		clientSecret: 'def' 
	};
	const secretString = JSON.stringify(secretValue);

	beforeEach(() => {
		secretsManagerClientMock.reset();
		jest.resetAllMocks();
		console.error = jest.fn();
	});

	test('should get secret value from Secrets Manager', async () => {

		secretsManagerClientMock.on(GetSecretValueCommand).resolves({
			SecretString: secretString,
		});

		const result = await getSecretValue<{ connectedAppSecret: ConnectedAppSecret }>(secretName);
		
		expect(secretsManagerClientMock.calls().length).toEqual(1);
		const getSecretArgs = secretsManagerClientMock.call(0)
			.firstArg as GetSecretValueCommand;
		expect(getSecretArgs.input.SecretId).toEqual(secretName);
		expect(result).toEqual(secretValue);
	});

	test('should throw error if no secret found', async () => {
		secretsManagerClientMock.on(GetSecretValueCommand).resolves({});

		await expect(
			getSecretValue<{ connectedAppSecret: ConnectedAppSecret }>(secretName),
		).rejects.toThrow('No secret found');
	});

	test('should throw error if Secrets Manager request fails', async () => {
		const errorMessage = 'Failed to get secret value';

		secretsManagerClientMock
			.on(GetSecretValueCommand)
			.rejects(new Error(errorMessage));

		await expect(
			getSecretValue<{ connectedAppSecret: ConnectedAppSecret }>(secretName),
		).rejects.toThrow('Failed to get secret value');
	});
});

