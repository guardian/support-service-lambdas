import type { SfAuthResponse } from '@modules/salesforce/auth/auth';
import { SfClientCredentialsTokenProvider } from '@modules/salesforce/auth/sfClientCredentialsTokenProvider';
import { SfPasswordFlowTokenProvider } from '@modules/salesforce/auth/sfPasswordFlowTokenProvider';

global.fetch = jest.fn();

describe('SfPasswordFlowTokenProvider', () => {
	const mockSuccessfulAuthResponse: SfAuthResponse = {
		access_token: 'mock_access_token',
		instance_url: 'https://test.salesforce.com',
		id: 'https://my.salesforce.com/id/mock_id',
		token_type: 'Bearer',
		issued_at: 'mock_issued_at',
		signature: 'mock_signature',
	};

	const tokenProvider = new SfPasswordFlowTokenProvider({
		authUrl: 'https://login.salesforce.com',
		username: 'mock_username',
		password: 'mock_password',
		token: 'mock_token',
		sfConnectedAppAuth: {
			clientId: 'mock_client_id',
			clientSecret: 'mock_client_secret',
		},
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should get authorisation successfully with password grant_type', async () => {
		(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve(mockSuccessfulAuthResponse),
		} as Response);

		const authorisation = await tokenProvider.getAuthorisation();

		expect(authorisation).toEqual({
			baseUrl: 'https://test.salesforce.com',
			authHeaders: {
				Authorization: 'Bearer mock_access_token',
			},
		});

		const calls = (fetch as jest.MockedFunction<typeof fetch>).mock.calls;
		const [url, options] = calls[0]!;
		expect(url).toBe('https://login.salesforce.com/services/oauth2/token');
		expect(options?.method).toBe('POST');
		expect(options?.headers).toEqual({ 'Content-Type': 'application/x-www-form-urlencoded' });

		const body = options?.body as string;
		expect(body).toContain('grant_type=password');
		expect(body).toContain('username=mock_username');
		expect(body).toContain('password=mock_passwordmock_token');
		expect(body).toContain('client_id=mock_client_id');
		expect(body).toContain('client_secret=mock_client_secret');
	});

	it('should handle fetch errors', async () => {
		(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
			ok: false,
			text: () => Promise.resolve('Error response text'),
		} as Response);

		await expect(tokenProvider.getAuthorisation()).rejects.toThrow(
			'Salesforce authentication failed: Error response text',
		);
	});

	it('should handle invalid response format', async () => {
		(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
			ok: true,
			json: () =>
				Promise.resolve({
					access_token: 'mock_access_token',
					instance_url: 'not_a_url',
				}),
		} as Response);

		await expect(tokenProvider.getAuthorisation()).rejects.toThrow(
			'Error parsing response from Salesforce:',
		);
	});
});

describe('SfClientCredentialsTokenProvider', () => {
	const mockSuccessfulAuthResponse: SfAuthResponse = {
		access_token: 'mock_access_token',
		instance_url: 'https://test.salesforce.com',
		id: 'https://my.salesforce.com/id/mock_id',
		token_type: 'Bearer',
		issued_at: 'mock_issued_at',
		signature: 'mock_signature',
	};

	const tokenProvider = new SfClientCredentialsTokenProvider({
		authUrl: 'https://login.salesforce.com',
		sfConnectedAppAuth: {
			clientId: 'mock_client_id',
			clientSecret: 'mock_client_secret',
		},
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should get authorisation successfully with client_credentials grant_type', async () => {
		(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve(mockSuccessfulAuthResponse),
		} as Response);

		const authorisation = await tokenProvider.getAuthorisation();

		expect(authorisation).toEqual({
			baseUrl: 'https://test.salesforce.com',
			authHeaders: {
				Authorization: 'Bearer mock_access_token',
			},
		});

		const calls = (fetch as jest.MockedFunction<typeof fetch>).mock.calls;
		const [url, options] = calls[0]!;
		expect(url).toBe('https://login.salesforce.com/services/oauth2/token');
		expect(options?.method).toBe('POST');
		expect(options?.headers).toEqual({ 'Content-Type': 'application/x-www-form-urlencoded' });

		const body = options?.body as string;
		expect(body).toContain('grant_type=client_credentials');
		expect(body).toContain('client_id=mock_client_id');
		expect(body).toContain('client_secret=mock_client_secret');
		expect(body).not.toContain('username=');
		expect(body).not.toContain('password=');
	});

	it('should handle fetch errors', async () => {
		(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
			ok: false,
			text: () => Promise.resolve('Error response text'),
		} as Response);

		await expect(tokenProvider.getAuthorisation()).rejects.toThrow(
			'Salesforce authentication failed: Error response text',
		);
	});

	it('should handle invalid response format', async () => {
		(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
			ok: true,
			json: () =>
				Promise.resolve({
					access_token: 'mock_access_token',
					instance_url: 'not_a_url',
				}),
		} as Response);

		await expect(tokenProvider.getAuthorisation()).rejects.toThrow(
			'Error parsing response from Salesforce:',
		);
	});
});
