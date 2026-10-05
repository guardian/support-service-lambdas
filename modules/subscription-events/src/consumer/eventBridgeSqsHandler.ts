import type { SQSRecord } from 'aws-lambda';
import type { z } from 'zod';
import { getCallerInfo } from '@modules/logger/getCallerInfo';
import { logger } from '@modules/logger/logger';
import type { HandlerEnv } from '@modules/routing/lambdaHandler';
import { SQSHandler } from '@modules/routing/sqsHandler';
import type { CancellationEvent } from '@modules/subscription-events/shared/cancellationEvent';
import { cancellationEventSchema } from '@modules/subscription-events/shared/cancellationEvent';

/**
 * Handler to process `Cancellation` events from the subscription events bus.
 *
 * Only handles `Cancellation` events for now - there's only one event type on the
 * bus today, so this deliberately isn't generalised to a discriminated union of
 * multiple event types yet. Once a second event type exists, revisit whether this
 * wrapper should take the event schema/type as a parameter, or a dedicated
 * wrapper per event type is added instead.
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
	handler: (event: CancellationEvent, services: Services) => Promise<void>,
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
	handler: (event: CancellationEvent, services: Services) => Promise<void>,
) {
	return async (record: SQSRecord, services: Services) => {
		const event = cancellationEventSchema.parse(JSON.parse(record.body));
		// worth wrapFn on handler or logging the event to get a nicer output?
		return logger.withContext(handler, ([e]) => e.detail.subscriptionNumber)(
			event,
			services,
		);
	};
}
