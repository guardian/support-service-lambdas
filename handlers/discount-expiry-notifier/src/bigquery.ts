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
		"SELECT tier.id, tier.tier, charge.id, DATE_ADD(charge.effective_start_date, INTERVAL charge.up_to_periods MONTH) as calculated_end_date, DATE_DIFF(charge.effective_end_date, charge.effective_start_date, MONTH) as months_diff, FROM `datatech-fivetran.zuora.rate_plan_charge_tier` tier JOIN `datatech-fivetran.zuora.rate_plan_charge` charge ON charge.id = tier.rate_plan_charge_id WHERE tier.id = '8a12926292c35f1d0192f3ca2e3b7a09'";

	const result = await bigquery.query(query);
	console.log('result', result);
	console.log('result.calculated_end_date', result.calculated_end_date);

	return 1;
};
