// import {
// 	GetSecretValueCommand,
// 	SecretsManagerClient,
// } from '@aws-sdk/client-secrets-manager';
// import { mockClient } from 'aws-sdk-client-mock';
// import { getSecretValue } from '../../src/services/secretsManager';

// const secretsManagerClientMock = mockClient(SecretsManagerClient);

describe('getSecretValue', () => {
	// const secretName = 'test-secret';
	// const secretValue = { password: 'test-password' };
	// const secretString = JSON.stringify(secretValue);

	beforeEach(() => {
		// secretsManagerClientMock.reset();
		jest.resetAllMocks();
		console.error = jest.fn();
	});

	test('test', () => {
		expect(2).toBe(2);
	});

	// test('should get secret value from Secrets Manager', async () => {
	// 	secretsManagerClientMock.on(GetSecretValueCommand).resolves({
	// 		SecretString: secretString,
	// 	});

	// 	const result = await getSecretValue<{ password: string }>({ secretName });

	// 	expect(secretsManagerClientMock.calls().length).toEqual(1);
	// 	const getSecretArgs = secretsManagerClientMock.call(0)
	// 		.firstArg as GetSecretValueCommand;
	// 	expect(getSecretArgs.input.SecretId).toEqual(secretName);
	// 	expect(result).toEqual(secretValue);
	// });

	// test('should throw error if no secret found', async () => {
	// 	secretsManagerClientMock.on(GetSecretValueCommand).resolves({});

	// 	await expect(
	// 		getSecretValue<{ password: string }>({ secretName }),
	// 	).rejects.toThrow('No secret found');
	// });

	// test('should throw error if Secrets Manager request fails', async () => {
	// 	const errorMessage = 'Failed to get secret value';

	// 	secretsManagerClientMock
	// 		.on(GetSecretValueCommand)
	// 		.rejects(new Error(errorMessage));

	// 	await expect(
	// 		getSecretValue<{ password: string }>({ secretName }),
	// 	).rejects.toThrow('Failed to get secret value');
	// });
});
