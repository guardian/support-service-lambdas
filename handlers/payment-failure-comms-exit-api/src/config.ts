import { z } from 'zod';
import { loadConfig } from '@modules/aws/appConfig';
import { getIfDefined } from '@modules/nullAndUndefined';

const appConfigSchema = z.object({
	braze: z.object({
		apiUrl: z.string().url(),
		apiKey: z.string().min(1),
		appId: z.string().min(1),
	}),
});

export type AppConfig = z.infer<typeof appConfigSchema>;

const getEnvironmentVariable = (name: string): string =>
	getIfDefined(process.env[name], `${name} environment variable not set`);

export const getAppConfig = (): Promise<AppConfig> =>
	loadConfig(
		getEnvironmentVariable('STAGE'),
		getEnvironmentVariable('STACK'),
		getEnvironmentVariable('APP'),
		appConfigSchema,
	);
