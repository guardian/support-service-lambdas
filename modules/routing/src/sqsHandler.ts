import type { SQSEvent, SQSRecord } from 'aws-lambda';
import type { z } from 'zod';
import type { HandlerProps } from '@modules/routing/lambdaHandler';
import { LambdaHandler } from '@modules/routing/lambdaHandler';
import { logger } from '@modules/routing/logger';

export function SQSHandler<ConfigType>(
	configSchema: z.ZodType<ConfigType, z.ZodTypeDef, unknown>,
	handler: (
		props: HandlerProps<ConfigType>,
		record: SQSRecord,
	) => Promise<void>,
) {
	return LambdaHandler(configSchema, handleSQSMessages<ConfigType>(handler));
}

export function handleSQSMessages<ConfigType>(
	recordHandler: (
		props: HandlerProps<ConfigType>,
		record: SQSRecord,
	) => Promise<void>,
) {
	const recordHandlerWithLogging = logger.wrapRouter(
		recordHandler,
		undefined,
		undefined,
		0,
		logger.getCallerInfo(),
	);

	return async (props: HandlerProps<ConfigType>, event: SQSEvent) => {
		try {
			for (const record of event.Records) {
				await recordHandlerWithLogging(props, record);
			}
		} catch (error) {
			console.error(error);
			throw error;
		}
	};
}
