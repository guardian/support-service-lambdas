import { buildAuthClient, runQuery } from '../bigquery';

export const handler = async () => {
	const gcpConfig = process.env.GCP_CONFIG ?? '';
	const authClient = await buildAuthClient(gcpConfig);
	const result = await runQuery(authClient);
	console.log('result: ', result);
	return result;
};
