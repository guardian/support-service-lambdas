import { z } from 'zod';
import { loadConfig } from '@modules/aws/appConfig';
import { getIfDefined } from '@modules/nullAndUndefined';

export const configSchema = z.object({
	mparticle: z.object({
		googleEnhancedConversionsConversionActionId: z.string().min(1),
		pod: z.string().min(1),
		key: z.string().min(1),
		secret: z.string().min(1),
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
