import type {
	EventsAPI,
	MParticleClient,
} from '../../services/mparticleClient';
import { z } from 'zod';

/**
 * Event Batch
 * https://docs.mparticle.com/developers/apis/http/#example-json-request-body
 * https://docs.mparticle.com/developers/apis/json-reference/
 */
export const eventBatchParser = {
	body: z.object({
		events: z
			.array(
				z.object({
					/** Custom data payload for the event */
					data: z.record(z.string(), z.unknown()),

					/** Type identifier for the event */
					eventType: z.string(),
				}),
			)
			.optional(),
		deviceInfo: z.record(z.string(), z.unknown()).optional(),
		userAttributes: z.record(z.string(), z.unknown()),
		deletedUserAttributes: z.array(z.string()).optional(),
		userIdentities: z.record(z.string(), z.unknown()), //
		applicationInfo: z.record(z.string(), z.unknown()).optional(),
		schemaVersion: z.number().optional(),
		environment: z.enum(['production', 'development']), //
		context: z.record(z.string(), z.unknown()).optional(),
		ip: z.string().optional(),
	}),
};

export type EventBatch = z.infer<typeof eventBatchParser.body>;

/**
 * Upload an event batch
 * Sends usage data into mParticle
 * https://docs.mparticle.com/developers/apis/http/#upload-an-event-batch
 * @param batch - The event batch to upload
 */
export const uploadAnEventBatch = async (
	mParticleEventsAPIClient: MParticleClient<EventsAPI>,
	batch: EventBatch,
): Promise<void> => {
	const response = await mParticleEventsAPIClient.post(
		`/events`,
		{
			events: batch.events?.map((event: { data: Record<string, unknown>; eventType: string }) => {
				return {
					data: event.data,
					event_type: event.eventType,
				};
			}),
			device_info: batch.deviceInfo,
			user_attributes: batch.userAttributes,
			deleted_user_attributes: batch.deletedUserAttributes,
			user_identities: batch.userIdentities,
			application_info: batch.applicationInfo,
			schema_version: batch.schemaVersion,
			environment: batch.environment,
			context: batch.context,
			ip: batch.ip,
		},
		() => undefined,
	);

	if (!response.success) {
		throw response.error;
	}
};
