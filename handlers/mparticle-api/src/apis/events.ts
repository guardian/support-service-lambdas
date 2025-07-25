import type { EventBatch } from '../../interfaces/event-batch';
import { AppConfig } from '../utils/config';
import type { HttpResponse } from '../utils/make-http-request';
import { makeHttpRequest } from '../utils/make-http-request';
import { z } from 'zod';

export class MParticleEventsClient {
	static create(
		inputPlatformConfig: AppConfig['inputPlatform'],
		pod: AppConfig['pod'],
	): MParticleEventsClient {
		const baseUrl = `https://s2s.${pod}.mparticle.com/v2`;
		/**
		 * Authentication
		 * The DSR API is secured via basic authentication. Credentials are issued at the level of an mParticle workspace.
		 * You can obtain credentials for your workspace from the Workspace Settings screen. Note that this authentication
		 * is for a single workspace and scopes the DSR to this workspace only.
		 * https://docs.mparticle.com/developers/apis/dsr-api/v3/#authentication
		 */
		const authHeader = `Basic ${Buffer.from(`${inputPlatformConfig.key}:${inputPlatformConfig.secret}`).toString('base64')}`;
		return new MParticleEventsClient(baseUrl, authHeader);
	}
	constructor(
		private baseUrl: string,
		private authHeader: string,
	) {}

	public async post<REQ, RESP>(
		path: string,
		body: REQ,
		schema: z.ZodType<RESP, z.ZodTypeDef, unknown>,
	): Promise<HttpResponse<RESP>> {
		return await this.fetch(path, 'POST', schema, body);
	}

	public async fetch<REQ, RESP>(
		path: string,
		method: 'GET' | 'POST',
		schema: z.ZodType<RESP, z.ZodTypeDef, unknown>,
		body?: REQ,
	): Promise<HttpResponse<RESP>> {
		return makeHttpRequest<RESP>(path, {
			method,
			schema,
			baseURL: this.baseUrl,
			headers: {
				'Content-Type': 'application/json',
				Authorization: this.authHeader,
			},
			body: body,
		});
	}
}

/**
 * Upload an event batch
 * Sends usage data into mParticle
 * https://docs.mparticle.com/developers/apis/http/#upload-an-event-batch
 * @param batch - The event batch to upload
 * @returns https://docs.mparticle.com/developers/apis/dsr-api/v3/#example-success-response-body
 */
export const uploadAnEventBatch = async (
	mParticleEventsClient: MParticleEventsClient,
	batch: EventBatch,
): Promise<object> => {
	const schema = z.object({});
	const response = await mParticleEventsClient.post(
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
		schema,
	);

	if (!response.success) {
		throw response.error;
	}

	return {};
};

export const setUserAttributesForRightToErasureRequest = async (
	mParticleEventsClient: MParticleEventsClient,
	environment: 'production' | 'development',
	userId: string,
	submittedTime: string,
): Promise<object> => {
	return uploadAnEventBatch(mParticleEventsClient, {
		userAttributes: {
			dsr_erasure_requested: true,
			dsr_erasure_status: 'requested',
			dsr_erasure_date: submittedTime,
		},
		userIdentities: {
			customer_id: userId,
		},
		environment: environment,
	});
};
