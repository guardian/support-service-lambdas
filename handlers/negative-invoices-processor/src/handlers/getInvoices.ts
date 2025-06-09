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
        inv.account_id AS account_id,
        inv.balance AS invoice_balance
    FROM 
        datatech-fivetran.zuora.invoice inv
    INNER JOIN 
        datatech-fivetran.zuora.subscription sub
        ON inv.account_id = sub.account_id
    WHERE 
        inv.amount < 0
        AND inv.balance != 0
        AND sub.status = 'Active'
    ORDER BY 
        inv.invoice_date
`;
