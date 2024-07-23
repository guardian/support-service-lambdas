import type {
	SfApiUserAuth,
	SfAuthResponse,
	SfConnectedAppAuth,
} from '../src/auth';
import { doSfAuth } from '../src/auth';

// Mock the global fetch function
global.fetch = jest.fn();

describe('doSfAuth', () => {
	const mockSuccessfulAuthResponse: SfAuthResponse = {
		access_token: 'mock_access_token',
		instance_url: 'https://login.salesforce.com/services/oauth2/token',
		id: 'https://my.salesforce.com/id/mock_id',
		token_type: 'Bearer',
		issued_at: 'mock_issued_at',
		signature: 'mock_signature',
	};

	const validApiUserAuth: SfApiUserAuth = {
		url: 'https://my.salesforce.com',
		grant_type: 'password',
		username: 'mock_username',
		password: 'mock_password',
		token: 'mock_token',
	};

	const validConnectedAppAuth: SfConnectedAppAuth = {
		clientId: 'mock_client_id',
		clientSecret: 'mock_client_secret',
	};

	it('should authenticate successfully', async () => {
		// Mock a successful response from the Salesforce authentication endpoint
		(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve(mockSuccessfulAuthResponse),
		} as Response);

		const response = await doSfAuth(validApiUserAuth, validConnectedAppAuth);
		expect(response).toEqual(mockSuccessfulAuthResponse);
	});

	it('should handle fetch errors', async () => {
		// Mock a failed response from the Salesforce authentication endpoint
		(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
			ok: false,
			text: () => Promise.resolve('Error response text'),
		} as Response);

		await expect(
			doSfAuth(validApiUserAuth, validConnectedAppAuth),
		).rejects.toThrow('Error response from Salesforce: Error response text');
	});

	it('should handle invalid response format', async () => {
		// Mock invalid response format from the Salesforce authentication endpoint
		(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
			ok: true,
			json: () =>
				Promise.resolve({
					access_token: 'mock_access_token',
					instance_url: 'not_a_url', // Invalid URL format
				}),
		} as Response);

		await expect(
			doSfAuth(validApiUserAuth, validConnectedAppAuth),
		).rejects.toThrow('Error parsing response from Salesforce:');
	});
});
