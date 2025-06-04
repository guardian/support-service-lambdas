import { getSSMParam } from '@modules/aws/ssm';
import { buildAuthClient, runQuery } from '@modules/bigquery/src/bigquery';
import { stageFromEnvironment } from '@modules/stage';
import { functionalTestQueryResponse } from '../../test/handlers/data/functionalTestQueryResponse';
import { BigQueryResultDataSchema } from '../types';

export const handler = async (): Promise<{
	allRecordsFromBigQueryCount: number;
	allRecordsFromBigQuery: Array<{
		id: string;
		account_id: string;
		invoice_date: string;
		currency: string;
		invoice_amount: number;
		invoice_balance: number;
	}>;
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

export const getCODEData = (): Promise<
	Array<{
		id: string;
		account_id: string;
		invoice_date: string;
		currency: string;
		invoice_amount: number;
		invoice_balance: number;
	}>
> => {
	return Promise.resolve(functionalTestQueryResponse);
};

export const getPRODData = async (): Promise<
	Array<{
		id: string;
		account_id: string;
		invoice_date: string;
		currency: string;
		invoice_amount: number;
		invoice_balance: number;
	}>
> => {
	const gcpConfig = await getSSMParam(
		`/negative-invoices-processor/${stageFromEnvironment()}/gcp-credentials-config`,
	);
	const authClient = await buildAuthClient(gcpConfig);

	const result = await runQuery(
		authClient,
		`datatech-platform-${stageFromEnvironment().toLowerCase()}`,
		query(),
	);
	console.log('result', result);

	const resultData = BigQueryResultDataSchema.parse(result[0]);
	console.log('resultData', resultData);
	return resultData;
};

const query = (): string =>
	`
    SELECT
        inv.id,
        STRING_AGG(distinct inv.account_id, ',') as account_id,
        STRING_AGG(DISTINCT CAST(inv.invoice_date AS STRING), ',') AS invoice_date,
        STRING_AGG(distinct inv.currency, ',') as currency,
        AVG(inv.amount) as invoice_amount,
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
