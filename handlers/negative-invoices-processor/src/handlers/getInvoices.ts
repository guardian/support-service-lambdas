import { getSSMParam } from '@modules/aws/ssm';
import { buildAuthClient, runQuery } from '@modules/bigquery/src/bigquery';
import { stageFromEnvironment } from '@modules/stage';
import { CODEDataMockQueryResponse } from '../../test/handlers/data/CODEDataMockQueryResponse';
import { BigQueryResultDataSchema } from '../types';
import type { BigQueryRecord } from '../types';

export const handler = async (): Promise<{
	invoicesCount: number;
	invoices: BigQueryRecord[];
}> => {
	try {
		const records =
			stageFromEnvironment() === 'PROD'
				? await getPRODData()
				: await getCODEData();
		return {
			invoicesCount: records.length,
			invoices: records,
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
        STRING_AGG(distinct inv.account_id, ',') AS account_id,
        MAX(inv.balance) AS invoice_balance
    FROM 
        datatech-fivetran.zuora.invoice inv
    INNER JOIN 
        datatech-fivetran.zuora.invoice_item item 
        ON item.invoice_id = inv.id
    INNER JOIN
        datatech-fivetran.zuora.subscription sub
        ON item.subscription_id = sub.id AND sub.is_latest_version
    WHERE 
        inv.amount < 0
        AND inv.balance != 0
        AND sub.status = 'Active'
    GROUP BY 
        inv.id
`;
