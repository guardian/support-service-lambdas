import { loadConfig } from '@modules/aws/appConfig';
import { Lazy } from '@modules/lazy';
import { getIfDefined } from '@modules/nullAndUndefined';
import dayjs from 'dayjs';
import type { z } from 'zod';
import { logger } from '@modules/routing/logger';

export type HandlerProps<ConfigType> = {
	now: dayjs.Dayjs;
	stage: string;
	config: ConfigType;
};

/**
 * This is a similar wrapper to the Router only it handles loading config
 *
 * @param configSchema schema for the SSM config for this lambda
 * @param handler the handler takes the config etc and the event, if any
 * @constructor
 */
export function LambdaHandler<ConfigType, E>(
	configSchema: z.ZodType<ConfigType, z.ZodTypeDef, unknown>,
	handler: (props: HandlerProps<ConfigType>, event: E) => Promise<void>,
) {
	// only load config on a cold start, don't load if this file is referenced in tests
	const lazyConfig = new Lazy(async () => {
		const stage = getEnv('STAGE');
		const stack = getEnv('STACK');
		const app = getEnv('APP');
		return { stage, config: await loadConfig(stage, stack, app, configSchema) };
	}, 'load config from SSM');

	const handlerWithLogging = logger.wrapRouter(
		handler,
		undefined,
		undefined,
		0,
		logger.getCallerInfo(),
	);

	return async (event: E): Promise<void> => {
		await handlerWithLogging(
			{ now: dayjs(), ...(await lazyConfig.get()) },
			event,
		);
	};
}

export const getEnv = (env: string): string =>
	getIfDefined(process.env[env], `${env} environment variable not set`);
