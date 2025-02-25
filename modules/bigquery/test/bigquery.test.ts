import { BigQuery } from '@google-cloud/bigquery';
import type { BaseExternalAccountClient } from 'google-auth-library';
import { runQuery } from '../src/bigquery';

jest.mock('@google-cloud/bigquery');
jest.mock('google-auth-library');

describe('bigquery.ts', () => {
	//   const mockClientConfig = JSON.stringify({
	//     type: 'external_account',
	//     audience: 'test-audience',
	//     subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
	//     token_url: 'https://oauth2.googleapis.com/token',
	//     credential_source: {
	//       file: '/path/to/credentials.json',
	//     },
	//   });

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
			const mockQueryResponse = [{ rows: [] }];
			(BigQuery.prototype.query as jest.Mock).mockResolvedValue(
				mockQueryResponse,
			);

			const result = await runQuery(
				mockAuthClient as BaseExternalAccountClient,
				'test-project-id',
				'SELECT * FROM test_table',
			);

			expect(BigQuery).toHaveBeenCalledWith({
				projectId: 'test-project-id',
				authClient: mockAuthClient,
			});
			expect(result).toBe(mockQueryResponse);
		});

		it('should throw an error if query execution fails', async () => {
			(BigQuery.prototype.query as jest.Mock).mockRejectedValue(
				new Error('Query execution failed'),
			);

			await expect(
				runQuery(
					mockAuthClient as BaseExternalAccountClient,
					'test-project-id',
					'SELECT * FROM test_table',
				),
			).rejects.toThrow('Query execution failed');
		});
	});
});
