import { buildAuthClient, runQuery } from '../bigquery';
import { getSSMParam } from '../ssm';

export const handler = async () => {

    const stage = process.env.Stage;

	if (!stage || (stage !== 'CODE' && stage !== 'PROD')) {
        return Promise.reject(new Error(`Invalid or missing stage: '${stage ?? ''}'`));
    }

    const gcpConfig = await getSSMParam('gcp-credentials-config', stage);
	const authClient = await buildAuthClient(gcpConfig);
	const result = await runQuery(authClient);
	console.log('result: ', result);
	return result;
};
