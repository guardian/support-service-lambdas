import { getSSMParam } from '@modules/aws/ssm';

export const MPARTICLE_API_KEY_PARAMETER =
	'/CODE/support/mparticle-api/inputPlatform/key';
export const MPARTICLE_API_SECRET_PARAMETER =
	'/CODE/support/mparticle-api/inputPlatform/secret';

export type AppConfig = {
	apiKey: string;
	apiSecret: string;
};

export const getAppConfig = async (): Promise<AppConfig> => {
	const [apiKey, apiSecret] = await Promise.all([
		getSSMParam(MPARTICLE_API_KEY_PARAMETER),
		getSSMParam(MPARTICLE_API_SECRET_PARAMETER),
	]);

	return { apiKey, apiSecret };
};
