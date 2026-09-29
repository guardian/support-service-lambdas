import type { SQSRecord } from 'aws-lambda';
import type { z } from 'zod';
import { getCallerInfo } from '@modules/logger/getCallerInfo';
import { logger } from '@modules/logger/logger';
import type { HandlerEnv } from '@modules/routing/lambdaHandler';
import { SQSHandler } from '@modules/routing/sqsHandler';
import type { SubscriptionEvent } from '@modules/subscription-events/shared/subscriptionEventSchema';
import { subscriptionEventSchema } from '@modules/subscription-events/shared/subscriptionEventSchema';

/**
 * Handler to process events from the subscription events bus.
 *
 * To use it
 *
 * <pre>
 * // called by AWS
 * export const handler = EventBridgeSQSHandler(
 * 	ConfigSchema,
 * 	handlerWithStage,
 * 	buildServices,
 * );
 * </pre>
 *
 * @param configSchema schema for the SSM config for this lambda
 * @param handler called once per validated event
 * @param buildServices build anything you want created once on cold start, passed
 *   into your handler
 */
export function EventBridgeSQSHandler<ConfigType, Services>(
	configSchema: z.ZodType<ConfigType>,
	handler: (event: SubscriptionEvent, services: Services) => Promise<void>,
	buildServices: (handlerProps: HandlerEnv<ConfigType>) => Services,
) {
	return SQSHandler(
		configSchema,
		handleSubscriptionEventMessage(handler),
		buildServices,
		getCallerInfo(),
	);
}

export function handleSubscriptionEventMessage<Services>(
	handler: (event: SubscriptionEvent, services: Services) => Promise<void>,
) {
	return async (record: SQSRecord, services: Services) => {
		const event = subscriptionEventSchema.parse(JSON.parse(record.body));
		// worth wrapFn on handler or logging the event to get a nicer output?
		return logger.withContext(handler, ([e]) => e.detail.subscriptionNumber)(
			event,
			services,
		);
	};
}
