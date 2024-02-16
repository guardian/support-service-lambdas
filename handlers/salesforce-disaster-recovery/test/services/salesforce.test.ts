import {
	generateSalesforceAccessToken,
	getSalesforceQueryResult,
	type SalesforceOauthCredentials,
} from '../../src/services';

describe('Salesforce API Functions', () => {
	const mockCredentials: SalesforceOauthCredentials = {
		authorization_endpoint: 'https://salesforce.com/auth',
		client_id: 'your_client_id',
		client_secret: 'your_client_secret',
		oauth_http_parameters: {
			body_parameters: [
				{ key: 'grant_type', value: 'password' },
				{ key: 'username', value: 'your_username' },
				{ key: 'password', value: 'your_password' },
			],
		},
	};

	beforeEach(() => {
		jest.resetModules();
		jest.resetAllMocks();
		console.error = jest.fn();
	});

	describe('generateSalesforceAccessToken', () => {
		it('should generate access token', async () => {
			const mockAccessToken = 'mock_access_token';
			const mockResponse = new Response(
				JSON.stringify({ access_token: mockAccessToken }),
			);

			jest
				.spyOn(global, 'fetch')
				.mockResolvedValue(Promise.resolve(mockResponse));

			const accessToken = await generateSalesforceAccessToken({
				credentials: mockCredentials,
			});

			expect(accessToken).toEqual(mockAccessToken);

			expect(fetch).toHaveBeenCalledWith(
				mockCredentials.authorization_endpoint,
				expect.objectContaining({ method: 'POST' }),
			);
		});

		it('should throw error on failure to generate access token', async () => {
			jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

			await expect(
				generateSalesforceAccessToken({ credentials: mockCredentials }),
			).rejects.toThrow('Failed to generate access token');
		});
	});

	describe('getSalesforceQueryResult', () => {
		const mockAccessToken = 'mock_access_token';
		const mockQueryJobId = 'mock_query_job_id';
		const mockApiDomain = 'https://salesforce.com/api';

		it('should return query results', async () => {
			const mockResponseText = 'Query results text';
			const mockResponse = new Response(mockResponseText);

			jest
				.spyOn(global, 'fetch')
				.mockResolvedValue(Promise.resolve(mockResponse));

			const queryResult = await getSalesforceQueryResult({
				accessToken: mockAccessToken,
				queryJobId: mockQueryJobId,
				apiDomain: mockApiDomain,
			});

			expect(queryResult).toEqual(mockResponseText);

			expect(fetch).toHaveBeenCalledWith(
				`${mockApiDomain}/services/data/v59.0/jobs/query/${mockQueryJobId}/results`,
				expect.objectContaining({ method: 'GET' }),
			);
		});

		it('should throw error on failure to get query results', async () => {
			jest
				.spyOn(global, 'fetch')
				.mockRejectedValueOnce(new Error('Network error'));

			await expect(
				getSalesforceQueryResult({
					accessToken: mockAccessToken,
					queryJobId: mockQueryJobId,
					apiDomain: mockApiDomain,
				}),
			).rejects.toThrow('Failed to get Salesforce query results');
		});
	});
});
