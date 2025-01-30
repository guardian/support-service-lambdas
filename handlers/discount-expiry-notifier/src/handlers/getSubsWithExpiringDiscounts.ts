import { stageFromEnvironment } from '@modules/stage';
import { buildAuthClient, runQuery } from '../bigquery';
import { getSSMParam } from '../ssm';

export const handler = async () => {
	const gcpConfig = await getSSMParam(
		'gcp-credentials-config',
		stageFromEnvironment(),
	);
	const authClient = await buildAuthClient(gcpConfig);
	const result = await runQuery(authClient);

	return {
		expiringDiscountsToProcess: result,
	};
};
