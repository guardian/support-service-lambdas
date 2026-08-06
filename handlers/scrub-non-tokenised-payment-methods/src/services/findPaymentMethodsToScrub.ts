import { getSSMParam } from '@modules/aws/ssm';
import { buildAuthClient, runQuery } from '@modules/bigquery/bigquery';
import type { Stage } from '@modules/stage';
import {
	gcpCredentialsConfigParameterName,
	gcpProjectId,
	PAYMENT_METHODS_TO_SCRUB_QUERY,
} from '../constants';

/**
 * Asks BigQuery for the payment methods this run should look at.
 *
 * The query reads the Fivetran mirror of Zuora, which lags, so nothing here is
 * acted on without being re-read from Zuora first.
 */
export const findPaymentMethodsToScrub = async (
	stage: Stage,
): Promise<unknown> => {
	const gcpConfig = await getSSMParam(gcpCredentialsConfigParameterName(stage));
	const authClient = await buildAuthClient(gcpConfig);

	const [rows] = await runQuery(
		authClient,
		gcpProjectId(stage),
		PAYMENT_METHODS_TO_SCRUB_QUERY,
	);

	return rows;
};
