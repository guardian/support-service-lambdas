import { getIfDefined } from '@modules/nullAndUndefined';
import { loadConfig } from '@modules/aws/appConfig';
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
});
export type AppConfig = z.infer<typeof ConfigSchema>;

export const getEnv = (env: string): string =>
	getIfDefined(process.env[env], `${env} environment variable not set`);

let appConfig: AppConfig | undefined = undefined;
export async function getAppConfig(): Promise<AppConfig> {
	if (!appConfig) {
		const stage = getEnv('STAGE');
		const stack = getEnv('STACK');
		const app = getEnv('APP');
		appConfig = await loadConfig(stage, stack, app, ConfigSchema);
	}
	return appConfig;
}
