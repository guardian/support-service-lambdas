import { z } from 'zod';
import { loadConfig } from '@modules/aws/appConfig';
import { getIfDefined } from '@modules/nullAndUndefined';

export const ConfigSchema = z.object({
	braze: z.object({
		apiUrl: z.string().min(1),
		apiKey: z.string().min(1),
	}),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

export const getEnv = (env: string): string =>
	getIfDefined(process.env[env], `${env} environment variable not set`);

export const getAppConfig = async (): Promise<AppConfig> => {
	const stage = getEnv('STAGE');
	const stack = getEnv('STACK');
	const app = getEnv('APP');

	return loadConfig(stage, stack, app, ConfigSchema);
};
