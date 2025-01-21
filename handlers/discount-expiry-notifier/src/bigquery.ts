import { BigQuery, BigQueryDate } from '@google-cloud/bigquery';
import type {
	BaseExternalAccountClient,
	ExternalAccountClientOptions,
} from 'google-auth-library';
import { ExternalAccountClient } from 'google-auth-library';

export const buildAuthClient = (
	clientConfig: string,
): Promise<BaseExternalAccountClient> =>
	new Promise((resolve, reject) => {
		try {
			const parsedConfig = JSON.parse(
				clientConfig,
			) as ExternalAccountClientOptions;
			const authClient = ExternalAccountClient.fromJSON(parsedConfig);
			if (authClient) {
				resolve(authClient);
			} else {
				reject(new Error('Failed to create Google Auth Client'));
			}
		} catch (error) {
			// Narrow the error type
			if (error instanceof Error) {
				reject(new Error(`Error parsing client config: ${error.message}`));
			} else {
				reject(new Error('Error parsing client config: An unknown error occurred'));
			}
		}
	});

export const runQuery = async (
	authClient: BaseExternalAccountClient,
): Promise<number> => {
	const bigquery = new BigQuery({
		projectId: 'datatech-platform-code',
		authClient,
	});

	const query = `
		SELECT 
			tier.id, 
			tier.tier, 
			charge.id AS id_1, 
			DATE_ADD(charge.effective_start_date, INTERVAL charge.up_to_periods MONTH) AS calculated_end_date, 
			DATE_DIFF(charge.effective_end_date, charge.effective_start_date, MONTH) AS months_diff
		FROM 
			\`datatech-fivetran.zuora.rate_plan_charge_tier\` tier 
		JOIN 
			\`datatech-fivetran.zuora.rate_plan_charge\` charge 
		ON 
			charge.id = tier.rate_plan_charge_id 
		WHERE 
			tier.id = '8a12926292c35f1d0192f3ca2e3b7a09'
	`;

	try {
		// Execute the query
		const [rows] = await bigquery.query({ query });
	
		// Type the rows as QueryResult[]
		const typedRows = rows as QueryResult[];
	
		// Log the results
		if (typedRows.length > 0) {
			const firstRow = typedRows[0] ?? null; // Safely assign firstRow or null
	
			if (firstRow && firstRow.calculated_end_date instanceof BigQueryDate) {
				console.log('calculated_end_date value:', firstRow.calculated_end_date.value);
			} else if (firstRow) {
				console.log('calculated_end_date:', firstRow.calculated_end_date);
			}
		} else {
			console.log('No rows returned from the query.');
		}
	
		return 1;
	} catch (error) {
		console.error('Error running query:', (error as Error).message);
		throw error;
	}
	
};

interface QueryResult {
	id: string;
	tier: number;
	id_1: string;
	calculated_end_date: BigQueryDate; // Ensure this matches the actual type
	months_diff: number;
}
