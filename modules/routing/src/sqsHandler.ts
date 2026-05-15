import type { SQSEvent, SQSRecord } from 'aws-lambda';
import type { z } from 'zod';
import { getCallerInfo } from '@modules/routing/getCallerInfo';
import type { HandlerEnv } from '@modules/routing/lambdaHandler';
import { LambdaHandlerWithServices } from '@modules/routing/lambdaHandler';
import { logger } from '@modules/routing/logger';
import { wrapFn } from '@modules/routing/wrapFn';

export function SQSHandler<ConfigType, Services>(
	configSchema: z.ZodType<ConfigType, z.ZodTypeDef, unknown>,
	handler: (record: SQSRecord, services: Services) => Promise<void>,
	buildServices: (handlerProps: HandlerEnv<ConfigType>) => Services,
) {
	const callerInfo = getCallerInfo();
	return LambdaHandlerWithServices(
		configSchema,
		handleSQSMessages(handler, callerInfo),
		buildServices,
		callerInfo,
	);
}

export function handleSQSMessages<Services>(
	recordHandler: (record: SQSRecord, services: Services) => Promise<void>,
	callerInfo: string,
) {
	const recordHandlerWithLogging = logger.withContext(
		wrapFn(recordHandler, undefined, callerInfo, ([event]) => ({
			logOnEntryOnly: [event],
			type: 'handler',
			regressionTestInput: event,
		})),
		([record]) => record.messageId,
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
