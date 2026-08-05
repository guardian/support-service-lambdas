import { getSSMParam } from '@modules/aws/ssm';
import { buildAuthClient, runQuery } from '@modules/bigquery/bigquery';
import { PAYMENT_METHODS_TO_SCRUB_QUERY } from '../constants';

/**
 * Asks BigQuery for the payment methods this run should look at.
 *
 * The query reads the Fivetran mirror of Zuora, which lags, so nothing here is
 * acted on without being re-read from Zuora first.
 */
export const findPaymentMethodsToScrub = async (): Promise<unknown> => {
	const gcpConfig = await getSSMParam(
		process.env.GCP_CREDENTIALS_CONFIG_PARAMETER_NAME!,
	);
	const authClient = await buildAuthClient(gcpConfig);

	const [rows] = await runQuery(
		authClient,
		process.env.GCP_PROJECT_ID!,
		PAYMENT_METHODS_TO_SCRUB_QUERY,
	);

	return rows;
};
