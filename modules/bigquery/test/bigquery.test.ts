import { BigQuery } from '@google-cloud/bigquery';
import type { QueryRowsResponse } from '@google-cloud/bigquery';
import type { BaseExternalAccountClient } from 'google-auth-library';
import { runQuery } from '../src/bigquery';

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
});
