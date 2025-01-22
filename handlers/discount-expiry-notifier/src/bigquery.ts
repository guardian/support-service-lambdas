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
				reject(
					new Error('Error parsing client config: An unknown error occurred'),
				);
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
			tier.id as id, 
			charge.effective_start_date as effectiveStartDate
		FROM 
			datatech-fivetran.zuora.rate_plan_charge_tier tier 
		JOIN 
			datatech-fivetran.zuora.rate_plan_charge charge 
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

			if (firstRow && firstRow.effectiveStartDate instanceof BigQueryDate) {
				console.log(
					'calculated_end_date value:',
					firstRow.effectiveStartDate.value,
				);
			} else if (firstRow) {
				console.log('calculated_end_date:', firstRow.effectiveStartDate);
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
	effectiveStartDate: BigQueryDate;
}
