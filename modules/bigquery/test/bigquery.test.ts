import { BigQuery } from '@google-cloud/bigquery';
import type { QueryRowsResponse } from '@google-cloud/bigquery';
import type { BaseExternalAccountClient } from 'google-auth-library';
import { ExternalAccountClient } from 'google-auth-library';
import { buildAuthClient, runQuery } from '../src/bigquery';

jest.mock('@google-cloud/bigquery');
jest.mock('google-auth-library');

describe('bigquery.ts', () => {
	const projectId = 'test-project-id';
	const query = 'SELECT * FROM test_table';

	const mockAuthClient: Partial<BaseExternalAccountClient> = {
		getAccessToken: jest.fn().mockResolvedValue('mock-access-token'),
		request: jest.fn(),
		getRequestHeaders: jest.fn().mockResolvedValue({}),
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('runQuery', () => {
		it('should run a query and return the result', async () => {
			const mockQueryResponse: QueryRowsResponse = [[{ rows: [] }]];
			(BigQuery.prototype.query as jest.Mock).mockResolvedValue(
				mockQueryResponse,
			);
			const result = await runQuery(
				mockAuthClient as BaseExternalAccountClient,
				projectId,
				query,
			);
			expect(BigQuery).toHaveBeenCalledWith({
				projectId: projectId,
				authClient: mockAuthClient,
			});
			expect(result).toBe(mockQueryResponse);
		});
		it('should throw an error if query execution fails', async () => {
			(BigQuery.prototype.query as jest.Mock).mockRejectedValue(
				new Error('Query execution failed'),
			);
			await expect(
				runQuery(mockAuthClient as BaseExternalAccountClient, projectId, query),
			).rejects.toThrow('Query execution failed');
		});
	});

	describe('buildAuthClient', () => {
		const validClientConfig = JSON.stringify({
			type: 'external_account',
			audience: 'test-audience',
			subject_token_type: 'test-subject-token-type',
			token_url: 'https://oauth2.googleapis.com/token',
		});

		const invalidClientConfig = 'invalid-json';

		it('should build an auth client with valid config', async () => {
			const mockAuthClient = {
				getAccessToken: jest.fn().mockResolvedValue('mock-access-token'),
			};

			(ExternalAccountClient.fromJSON as jest.Mock).mockReturnValue(
				mockAuthClient,
			);

			const result = await buildAuthClient(validClientConfig);

			// eslint-disable-next-line @typescript-eslint/unbound-method -- jest mock
			expect(ExternalAccountClient.fromJSON as jest.Mock).toHaveBeenCalledWith(
				JSON.parse(validClientConfig),
			);
			expect(result).toBe(mockAuthClient);
		});

		it('should throw an error with invalid config', async () => {
			await expect(buildAuthClient(invalidClientConfig)).rejects.toThrow(
				'Error building auth client: Unexpected token \'i\', "invalid-json" is not valid JSON',
			);
		});

		it('should throw an error if auth client creation fails', async () => {
			(ExternalAccountClient.fromJSON as jest.Mock).mockReturnValue(null);

			await expect(buildAuthClient(validClientConfig)).rejects.toThrow(
				'Failed to create Google Auth Client',
			);
		});
	});
});
