import type { QueryRowsResponse } from '@google-cloud/bigquery';
import { BigQuery } from '@google-cloud/bigquery';
import type {
	BaseExternalAccountClient,
	ExternalAccountClientOptions,
} from 'google-auth-library';
import { ExternalAccountClient } from 'google-auth-library';

export const buildAuthClient = async (
	clientConfig: string,
): Promise<BaseExternalAccountClient> => {
	try {
		const parsedConfig = JSON.parse(
			clientConfig,
		) as ExternalAccountClientOptions;
		const authClient = ExternalAccountClient.fromJSON(parsedConfig);

		if (!authClient) {
			throw new Error('Failed to create Google Auth Client');
		}

		return await Promise.resolve(authClient);
	} catch (error) {
		throw new Error(`Error building auth client: ${(error as Error).message}`);
	}
};

export const runQuery = async (
	authClient: BaseExternalAccountClient,
	projectId: string,
	query: string,
): Promise<QueryRowsResponse> => {
	const bigQueryClient = new BigQuery({
		projectId,
		authClient,
	});
	return await bigQueryClient.query(query);
};
