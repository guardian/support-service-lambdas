import { z } from 'zod';

/**
 * Builds the schema for one EventBridge event "shape": the standard envelope
 * fields (as documented at
 * https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-events-structure.html)
 * plus a specific `detail-type` literal and `detail` schema, so a bus's full set of
 * event types can be composed into a `z.discriminatedUnion('detail-type', [...])`.
 *
 * @param detailType the exact `detail-type` value this producer sends, used to
 *   discriminate this event from others on the same bus
 * @param detailSchema schema for this event's `detail` payload
 */
export function eventBridgeEnvelopeSchema<
	DetailType extends string,
	DetailSchema extends z.ZodType,
>(detailType: DetailType, detailSchema: DetailSchema) {
	return z.object({
		version: z.string(),
		id: z.string(),
		'detail-type': z.literal(detailType),
		source: z.string(),
		account: z.string(),
		time: z.string(),
		region: z.string(),
		resources: z.array(z.string()),
		detail: detailSchema,
	});
}
