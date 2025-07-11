import type { EventBatch } from '../../interfaces/event-batch';
import { getAppConfig } from '../config';
import type { HttpResponse } from '../http';
import { makeHttpRequest } from '../http';

async function requestEventsApi<T>(
	url: string,
	options: {
		method?: 'POST';
		body?: unknown;
	},
): Promise<HttpResponse<T>> {
	const appConfig = await getAppConfig();
	return makeHttpRequest<T>(url, {
		method: options.method,
		baseURL: `https://s2s.${appConfig.pod}.mparticle.com/v2`,
		headers: {
			'Content-Type': 'application/json',
			/**
			 * Authentication
			 * The DSR API is secured via basic authentication. Credentials are issued at the level of an mParticle workspace.
			 * You can obtain credentials for your workspace from the Workspace Settings screen. Note that this authentication
			 * is for a single workspace and scopes the DSR to this workspace only.
			 * https://docs.mparticle.com/developers/apis/dsr-api/v3/#authentication
			 */
			Authorization: `Basic ${Buffer.from(`${appConfig.inputPlatform.key}:${appConfig.inputPlatform.secret}`).toString('base64')}`,
		},
		body: options.body,
	});
}

/**
 * Upload an event batch
 * Sends usage data into mParticle
 * https://docs.mparticle.com/developers/apis/http/#upload-an-event-batch
 * @param batch - The event batch to upload
 * @returns https://docs.mparticle.com/developers/apis/dsr-api/v3/#example-success-response-body
 */
export const uploadAnEventBatch = async (
	batch: EventBatch,
): Promise<object> => {
	const response = await requestEventsApi(`/events`, {
		method: 'POST',
		body: {
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
	});

	if (!response.success) {
		throw response.error;
	}

	return {};
};

export { requestEventsApi };
