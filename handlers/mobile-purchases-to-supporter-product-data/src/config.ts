import { loadConfig } from '@modules/aws/appConfig';
import { getIfDefined } from '@modules/nullAndUndefined';
import { z } from 'zod';

const configSchema = z.object({
	mobilePurchasesApiKey: z.string(),
});

export type Config = z.infer<typeof configSchema>;

export const getEnv = (env: string): string =>
	getIfDefined(process.env[env], `${env} environment variable not set`);

export const getConfig = async () => {
	const stage = getEnv('STAGE');
	const stack = getEnv('STACK');
	const app = getEnv('APP');
	return await loadConfig(stage, stack, app, configSchema);
};
