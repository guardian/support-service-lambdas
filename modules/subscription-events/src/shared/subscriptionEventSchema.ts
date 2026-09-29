import { z } from 'zod';
import { cancellationEventSchema } from '@modules/subscription-events/shared/cancellationEvent';

/**
 * Union of every event type published to the `subscription-events-STAGE` bus,
 * discriminated by the envelope's `detail-type` field. This file's only job is
 * composing the union - add each new event type's own schema (defined in its own
 * file, e.g. `cancellationEvent.ts`) to the array below as it's introduced.
 */
export const subscriptionEventSchema = z.discriminatedUnion('detail-type', [
	cancellationEventSchema,
]);
export type SubscriptionEvent = z.infer<typeof subscriptionEventSchema>;
