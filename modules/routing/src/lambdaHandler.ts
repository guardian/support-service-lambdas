import { loadConfig } from '@modules/aws/appConfig';
import { invokeFunction } from '@modules/aws/lambda';
import { Lazy } from '@modules/lazy';
import { getIfDefined } from '@modules/nullAndUndefined';
import dayjs from 'dayjs';
import type { z } from 'zod';
import { getCallerInfo } from '@modules/routing/getCallerInfo';
import { logger } from '@modules/routing/logger';

export type HandlerEnv<ConfigType> = {
	now: () => dayjs.Dayjs;
	stage: string;
	config: ConfigType;
};

/**
 * This is a similar wrapper to the Router, it handles loading config on
 * cold start.
 *
 * This means your handler function is cleaner and also easier to unit test.
 *
 * @param configSchema schema for the SSM config for this lambda
 * @param handler
 * @constructor
 */
export function LambdaHandler<ConfigType, E>(
	configSchema: z.ZodType<ConfigType, z.ZodTypeDef, unknown>,
	handler: (event: E, env: HandlerEnv<ConfigType>) => Promise<void>,
) {
	const callerInfo = getCallerInfo();
	const handlerWithEntryExitLogging = logger.wrapFn(
		handler,
		undefined,
		callerInfo,
		([event]) => ({
			logOnEntryOnly: [event],
			regressionTestInput: event,
		}),
	);
	return LambdaHandlerWithServices(
		configSchema,
		handlerWithEntryExitLogging,
		(servicesAndConfig) => servicesAndConfig,
		callerInfo,
	);
}

/**
 * This is a similar wrapper to the Router only it handles loading config and
 * building any services e.g. ZuoraClient on cold start
 *
 * This means your handler function is cleaner and also easier to unit test.
 *
 * @param configSchema schema for the SSM config for this lambda
 * @param handler
 * @param buildServices build anything you want to be created on cold start only, it will be passed into your handler
 * @constructor
 */
export function LambdaHandlerWithServices<ConfigType, Services, E>(
	configSchema: z.ZodType<ConfigType, z.ZodTypeDef, unknown>,
	handler: (event: E, services: Services) => Promise<void>,
	buildServices: (handlerProps: HandlerEnv<ConfigType>) => Services,
	callerInfo: string,
) {
	// only expect env vars on a cold start, don't load if this file is referenced in tests
	const lazyEnv = new Lazy(() => {
		const stage = getEnv('STAGE');
		const stack = getEnv('STACK');
		const app = getEnv('APP');
		return Promise.resolve({ stage, stack, app });
	}, 'load config from SSM');

	const handlerProps: Lazy<Services> = lazyEnv.then(
		logger.wrapFn(
			async ({ stage, stack, app }) => {
				const config = await loadConfig(stage, stack, app, configSchema);
				const handlerProps = { now: () => dayjs(), stage, config };
				return buildServices(handlerProps);
			},
			'lambdaColdStart',
			callerInfo,
			(args) => ({ logOnEntryOnly: args, regressionTestColdStartEnv: args }),
		),
	);

	const handlerWithContextClearance = logger.withContext(
		handler,
		undefined,
		true,
	);

	return async (event: E) => {
		return await handlerWithContextClearance(event, await handlerProps.get());
	};
}

/**
 * use this when you want to run the lambda locally end to end as if it's in CODE
 *
 * It sets/clears the env vars which is not ideal but hopefully they won't leak
 * anywhere they shouldn't
 *
 * @param handler the function that AWS lambda references
 * @param testEvent
 * @param app the name of the app for loading config e.g. alarms-handler
 */
export function runWithConfig<E>(
	handler: (e: E) => Promise<void>,
	testEvent: E,
	app: string,
): void {
	if (process.env.APP || process.env.STAGE || process.env.STACK) {
		throw new Error('stack/stage/app already defined');
	}
	process.env.APP = app;
	process.env.STAGE = 'CODE';
	process.env.STACK = 'support';
	handler(testEvent)
		.then(console.log)
		.catch(console.error)
		.finally(function () {
			process.env.APP = undefined;
			process.env.STAGE = undefined;
			process.env.STACK = undefined;
		});
}

/**
 * use this when you want to run a lambda directly against CODE
 *
 * Make sure you have janus credentials.
 *
 * Use `pnpm update-lambda` or `pnpm update-lambda --quick` first to get the
 * latest code uploaded.
 *
 * @param functionName
 * @param testEvent
 */
export function invokeCODELambda(functionName: string, testEvent: object) {
	invokeFunction(functionName, JSON.stringify(testEvent))
		.then(console.log)
		.catch(console.error)
		.finally(() =>
			console.log(
				`\n\nLog group link: https://eu-west-1.console.aws.amazon.com/cloudwatch/home?region=eu-west-1#logsV2:log-groups/log-group/$252Faws$252Flambda$252F${functionName}`,
			),
		);
}

export const getEnv = (env: string): string =>
	getIfDefined(process.env[env], `${env} environment variable not set`);
