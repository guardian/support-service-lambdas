import { loadConfig } from '@modules/aws/appConfig';
import { getIfDefined } from '@modules/nullAndUndefined';
import { z } from 'zod';

export const ConfigSchema = z.object({
	workspace: z.object({
		key: z.string(),
		secret: z.string(),
	}),
	inputPlatform: z.object({
		key: z.string(),
		secret: z.string(),
	}),
	pod: z.string(),
	sarResultsBucket: z.string(),
});
export type AppConfig = z.infer<typeof ConfigSchema>;

export const getEnv = (env: string): string =>
	getIfDefined(process.env[env], `${env} environment variable not set`);

export async function getAppConfig(): Promise<AppConfig> {
	const stage = getEnv('STAGE');
	const stack = getEnv('STACK');
	const app = getEnv('APP');
	return loadConfig(stage, stack, app, ConfigSchema);
}
