import { BigQuery } from '@google-cloud/bigquery';
import { stageFromEnvironment } from '@modules/stage';
import type {
	BaseExternalAccountClient,
	ExternalAccountClientOptions,
} from 'google-auth-library';
import { ExternalAccountClient } from 'google-auth-library';
import type { BigQueryRecord } from '../../../handlers/discount-expiry-notifier/src/types';
import { testQueryResponse } from './testQueryResponse';
import { BigQueryResultDataSchema } from './types';

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
	query: string,
): Promise<BigQueryRecord[]> => {
	const bigquery = new BigQuery({
		projectId: `datatech-platform-${stageFromEnvironment().toLowerCase()}`,
		authClient,
	});

	const result = await bigquery.query(query);
	console.log('result', result);

	const resultData = BigQueryResultDataSchema.parse(result[0]);
	console.log('resultData', resultData);

	const dataToUse =
		stageFromEnvironment().toLowerCase() === 'prod'
			? resultData
			: testQueryResponse;
	return dataToUse;
};
