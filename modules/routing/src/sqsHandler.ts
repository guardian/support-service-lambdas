import type { SQSEvent, SQSRecord } from 'aws-lambda';
import type { z } from 'zod';
import type { HandlerEnv } from '@modules/routing/lambdaHandler';
import { LambdaHandlerWithServices } from '@modules/routing/lambdaHandler';
import { logger } from '@modules/routing/logger';

export function SQSHandler<ConfigType, Services>(
	configSchema: z.ZodType<ConfigType, z.ZodTypeDef, unknown>,
	handler: (record: SQSRecord, services: Services) => Promise<void>,
	buildServices: (handlerProps: HandlerEnv<ConfigType>) => Services,
) {
	return LambdaHandlerWithServices(
		configSchema,
		handleSQSMessages(handler),
		buildServices,
	);
}

export function handleSQSMessages<Services>(
	recordHandler: (record: SQSRecord, services: Services) => Promise<void>,
) {
	const recordHandlerWithLogging = logger.wrapFn(
		recordHandler,
		'FUNCTION',
		({ args, paramNames }) => ({
			args: [args[0]],
			paramNames: [paramNames[0]],
		}),
		(nothing) => nothing,
		(args) => args[0],
		() => undefined,
		undefined,
		undefined,
		0,
		logger.getCallerInfo(),
		(args) => args[0].messageId,
	);

	return async (event: SQSEvent, services: Services) => {
		try {
			for (const record of event.Records) {
				await recordHandlerWithLogging(record, services);
			}
		} catch (error) {
			logger.error('Caught exception with message: ', error);
			throw error;
		}
	};
}
