import type { SQSRecord } from 'aws-lambda';
import type { z } from 'zod';
import { getCallerInfo } from '@modules/logger/getCallerInfo';
import { logger } from '@modules/logger/logger';
import type { HandlerEnv } from '@modules/routing/lambdaHandler';
import { SQSHandler } from '@modules/routing/sqsHandler';
import type { CancellationEvent } from '@modules/subscription-events/shared/cancellationEvent';
import { cancellationEventSchema } from '@modules/subscription-events/shared/cancellationEvent';

/**
 * Handler to process `Cancellation` events from the cancellations bus.
 *
 * Deliberately specific to `Cancellation` events, not generalised to a
 * discriminated union/generic event type: each EventBridge bus only ever
 * carries one event type (a new bus is created for each new event type,
 * rather than routing multiple types through one bus via `detail-type` - see
 * `PLAN-cancellation-bus-rename.md`), so a dedicated wrapper per event type
 * is the permanent design, not a stopgap.
 *
 * To use it
 *
 * <pre>
 * // called by AWS
 * export const handler = CancellationEventSQSHandler(
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
export function CancellationEventSQSHandler<ConfigType, Services>(
	configSchema: z.ZodType<ConfigType>,
	handler: (event: CancellationEvent, services: Services) => Promise<void>,
	buildServices: (handlerProps: HandlerEnv<ConfigType>) => Services,
) {
	return SQSHandler(
		configSchema,
		handleCancellationEventMessage(handler),
		buildServices,
		getCallerInfo(),
	);
}

export function handleCancellationEventMessage<Services>(
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
