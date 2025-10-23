import { loadConfig } from '@modules/aws/appConfig';
import { getIfDefined } from '@modules/nullAndUndefined';
import { logger } from '@modules/routing/logger';
import { Stage } from '@modules/stage';
import { z } from 'zod';

const configSchema = z.object({
	mobilePurchasesApiKey: z.string(),
});

export type Config = z.infer<typeof configSchema>;

export const getEnv = (env: string, defaultValue: string | undefined): string =>
	process.env[env] ??
	getIfDefined(
		defaultValue,
		`Environment variable ${env} was not set and no default value was provided`,
	);

export const getConfig = async (defaults?: {
	stage: Stage;
	stack: string;
	app: string;
}) => {
	const stage = getEnv('STAGE', defaults?.stage);
	const stack = getEnv('STACK', defaults?.stack);
	const app = getEnv('APP', defaults?.app);
	const config = await loadConfig(stage, stack, app, configSchema);
	logger.log('info', `Successfully loaded config`);
	return config;
};
