import { getSSMParam } from '@modules/aws/ssm';
import { buildAuthClient, runQuery } from '@modules/bigquery/src/bigquery';
import { stageFromEnvironment } from '@modules/stage';
import { CODEDataMockQueryResponse } from '../../test/handlers/data/CODEDataMockQueryResponse';
import { BigQueryResultDataSchema } from '../types';
import type { BigQueryRecord } from '../types';

export const handler = async (): Promise<{
	allRecordsFromBigQueryCount: number;
	allRecordsFromBigQuery: BigQueryRecord[];
}> => {
	try {
		const records =
			stageFromEnvironment() === 'PROD'
				? await getPRODData()
				: await getCODEData();
		return {
			allRecordsFromBigQueryCount: records.length,
			allRecordsFromBigQuery: records,
		};
	} catch (error) {
		console.error('Error:', error);
		throw error;
	}
};

export const getCODEData = (): Promise<BigQueryRecord[]> => {
	return Promise.resolve(CODEDataMockQueryResponse);
};

export const getPRODData = async (): Promise<BigQueryRecord[]> => {
	const gcpConfig = await getSSMParam(
		`/negative-invoices-processor/${stageFromEnvironment()}/gcp-credentials-config`,
	);
	const authClient = await buildAuthClient(gcpConfig);

	const result = await runQuery(
		authClient,
		`datatech-platform-${stageFromEnvironment().toLowerCase()}`,
		query(),
	);

	return BigQueryResultDataSchema.parse(result[0]);
};

const query = (): string =>
	`
    SELECT
        inv.id,
        STRING_AGG(distinct inv.account_id, ',') as account_id,
        AVG(inv.balance) as invoice_balance,
    FROM 
        datatech-fivetran.zuora.invoice inv
    WHERE 
        inv.amount < 0 AND inv.balance != 0
    GROUP BY 
        1
    ORDER BY 
        invoice_date
`;
