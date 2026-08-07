import { buildAuthClient, runQuery } from '@modules/bigquery/bigquery';
import type { Stage } from '@modules/stage';
import { getAppConfig } from '../config';
import { gcpProjectId, PAYMENT_METHODS_TO_SCRUB_QUERY } from '../constants';
import { paymentMethodsToScrubSchema } from '../schemas';
import type { PaymentMethodToScrub } from '../types';

/**
 * Asks BigQuery for the payment methods this run should look at.
 *
 * The query reads the Fivetran mirror of Zuora, which lags, so nothing here is
 * acted on without being re-read from Zuora first.
 */
export const findPaymentMethodsToScrub = async (
	stage: Stage,
): Promise<PaymentMethodToScrub[]> => {
	const { gcpCredentialsConfig } = await getAppConfig(stage);
	const authClient = await buildAuthClient(gcpCredentialsConfig);

	const [rows] = await runQuery(
		authClient,
		gcpProjectId(stage),
		PAYMENT_METHODS_TO_SCRUB_QUERY,
	);

	return paymentMethodsToScrubSchema.parse(rows);
};
