import {
	GetSecretValueCommand,
	SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { mockClient } from 'aws-sdk-client-mock';
import { getSecretValue } from '../../src/services/secretsManager';

const secretsManagerClientMock = mockClient(SecretsManagerClient);

describe('getSecretValue', () => {
	beforeEach(() => {
		secretsManagerClientMock.reset();
		jest.resetAllMocks();
		console.log = jest.fn();
		console.error = jest.fn();
	});

	test('should get secret value from Secrets Manager', async () => {
		// Arrange
		const secretName = 'test-secret';
		const secretValue = { password: 'test-password' };
		const secretString = JSON.stringify(secretValue);

		secretsManagerClientMock.on(GetSecretValueCommand).resolves({
			SecretString: secretString,
		});

		// Act
		const result = await getSecretValue<{ password: string }>({ secretName });

		// Assert
		expect(secretsManagerClientMock.calls().length).toEqual(1);
		const getSecretArgs = secretsManagerClientMock.call(0)
			.firstArg as GetSecretValueCommand;
		expect(getSecretArgs.input.SecretId).toEqual(secretName);
		expect(result).toEqual(secretValue);
	});

	test('should throw error if no secret found', async () => {
		// Arrange
		const secretName = 'non-existent-secret';

		secretsManagerClientMock.on(GetSecretValueCommand).resolves({});

		// Act and Assert
		await expect(
			getSecretValue<{ password: string }>({ secretName }),
		).rejects.toThrow('No secret found');
	});

	test('should throw error if Secrets Manager request fails', async () => {
		// Arrange
		const secretName = 'test-secret';
		const errorMessage = 'Failed to get secret value';

		secretsManagerClientMock
			.on(GetSecretValueCommand)
			.rejects(new Error(errorMessage));

		// Act and Assert
		await expect(
			getSecretValue<{ password: string }>({ secretName }),
		).rejects.toThrow('Failed to get secret value');
	});
});
