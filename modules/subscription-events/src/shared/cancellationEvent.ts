import { z } from 'zod';
import { eventBridgeEnvelopeSchema } from '@modules/aws/eventBridgeEnvelope';
import {
	orderNumberSchema,
	subscriptionNumberSchema,
} from '@modules/zuora/identifiers';

/**
 * `detail` payload for a `Cancellation` subscription-event - published whenever a
 * subscription is cancelled.
 */
export const cancellationDetailSchema = z.object({
	subscriptionNumber: subscriptionNumberSchema,
	/**
	 * The order that caused the cancellation.
	 */
	orderNumber: orderNumberSchema,
	/**
	 * false avoids notifying the user, e.g. for CSR cancellations where a cancellation
	 * email would be inappropriate.
	 */
	allowUserNotifications: z.boolean(),
});
export type CancellationDetail = z.infer<typeof cancellationDetailSchema>;

export const cancellationEventSchema = eventBridgeEnvelopeSchema(
	'Cancellation',
	cancellationDetailSchema,
);
export type CancellationEvent = z.infer<typeof cancellationEventSchema>;
