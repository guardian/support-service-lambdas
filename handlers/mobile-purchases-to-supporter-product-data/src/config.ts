import { loadConfig } from '@modules/aws/appConfig';
import { logger } from '@modules/routing/logger';
import { z } from 'zod';

const configSchema = z.object({
	mobilePurchasesApiKey: z.string(),
});

export type Config = z.infer<typeof configSchema>;

export const getEnv = (env: string, defaultValue: string): string =>
	process.env[env] ?? defaultValue;

export const getConfig = async () => {
	const stage = getEnv('STAGE', 'CODE');
	const stack = getEnv('STACK', 'support');
	const app = getEnv('APP', 'mobile-purchases-to-supporter-product-data');
	const config = await loadConfig(stage, stack, app, configSchema);
	logger.log('info', `Successfully loaded config`);
	return config;
};
