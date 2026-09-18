import { z } from 'zod';
import { loadConfig } from '@modules/aws/appConfig';
import { getIfDefined } from '@modules/nullAndUndefined';

export const DEFAULT_MPARTICLE_ENDPOINT =
	'https://s2s.eu1.mparticle.com/v2/events';

export const configSchema = z.object({
	mparticle: z.object({
		apiKey: z.string().min(1),
		apiSecret: z.string().min(1),
		googleEnhancedConversionsConversionActionId: z.string().min(1),
		endpoint: z.string().url().optional().default(DEFAULT_MPARTICLE_ENDPOINT),
	}),
});

export type AppConfig = z.infer<typeof configSchema>;

export const getEnv = (env: string): string =>
	getIfDefined(process.env[env], `${env} environment variable not set`);

export const getAppConfig = async (): Promise<AppConfig> => {
	const stage = getEnv('STAGE');
	const stack = getEnv('STACK');
	const app = getEnv('APP');

	return loadConfig(stage, stack, app, configSchema);
};
