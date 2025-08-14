import type {
	EventsAPI,
	MParticleClient,
} from '../../services/mparticleClient';
import { eventBatchParser } from '../../routers/http/upload-event-batch';
import { z } from 'zod';

export type EventBatch = z.infer<typeof eventBatchParser.body>;

/**
 * Upload an event batch
 * Sends usage data into mParticle
 * https://docs.mparticle.com/developers/apis/http/#upload-an-event-batch
 * @param batch - The event batch to upload
 * @returns https://docs.mparticle.com/developers/apis/dsr-api/v3/#example-success-response-body
 */
export const uploadAnEventBatch = async (
	mParticleEventsAPIClient: MParticleClient<EventsAPI>,
	batch: EventBatch,
): Promise<object> => {
	const response = await mParticleEventsAPIClient.post(
		`/events`,
		{
			events: batch.events?.map((event) => {
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

	return {};
};
