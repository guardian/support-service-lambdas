
import type { SimpleQueryRowsResponse} from "@google-cloud/bigquery";
import {BigQuery} from "@google-cloud/bigquery";
import { ExternalAccountClient, type BaseExternalAccountClient, type ExternalAccountClientOptions } from 'google-auth-library';
import { getSSMParam } from './lib/ssm';

export const handler = async () => {

    const gcpConfig = await getSSMParam('gcp-wif-credentials-config', stage);
	const authClient = await buildAuthClient(gcpConfig);
    const response = getDataFromBigquery(authClient);
    console.log('response: ', response);


};

export const buildAuthClient = async (clientConfig: string): Promise<BaseExternalAccountClient> => new Promise((resolve, reject) => {
	const parsedConfig = JSON.parse(clientConfig) as ExternalAccountClientOptions;
	const authClient = ExternalAccountClient.fromJSON(parsedConfig);
	if (authClient) {
		resolve(authClient);
	} else {
		reject('Failed to create Google Auth Client');
	}
});

export const getDataFromBigquery = async (
	authClient: BaseExternalAccountClient
): Promise<SimpleQueryRowsResponse> => {
	const bigquery = new BigQuery({
		projectId: `datatech-fivetran`,
		authClient,
	});

    const query = "SELECT tier.id FROM `datatech-fivetran.zuora.rate_plan_charge_tier` tier WHERE tier.id = '8a12926292c35f1d0192f3ca2e3b7a09'"
	console.log('Running query: ', query);
	const rows = await bigquery.query({query});
	return rows;
}
