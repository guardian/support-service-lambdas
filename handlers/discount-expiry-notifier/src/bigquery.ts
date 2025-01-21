import { BigQuery } from '@google-cloud/bigquery';
import type {
	BaseExternalAccountClient,
	ExternalAccountClientOptions,
} from 'google-auth-library';
import { ExternalAccountClient } from 'google-auth-library';

export const buildAuthClient = (
	clientConfig: string,
): Promise<BaseExternalAccountClient> =>
	new Promise((resolve, reject) => {
		const parsedConfig = JSON.parse(
			clientConfig,
		) as ExternalAccountClientOptions;
		const authClient = ExternalAccountClient.fromJSON(parsedConfig);
		if (authClient) {
			resolve(authClient);
		} else {
			reject(new Error('Failed to create Google Auth Client'));
		}
	});

export const runQuery = async (
	authClient: BaseExternalAccountClient,
): Promise<number> => {
	const bigquery = new BigQuery({
		projectId: `datatech-platform-code`,
		authClient,
	});

	const query =
		"SELECT tier.id, tier.tier FROM `datatech-fivetran.zuora.rate_plan_charge_tier` tier WHERE tier.id = '8a12926292c35f1d0192f3ca2e3b7a09'";

	const result = await bigquery.query(query);
	console.log('result', result);

	return 1;
};
