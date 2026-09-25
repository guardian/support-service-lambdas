import { z } from 'zod';
import { logger } from '@modules/logger/logger';
import type { EventsAPI, MParticleClient } from './mparticleHttpClient';
import {
	MParticleHttpError,
	type MParticleHttpResponse,
	MParticleNetworkError,
} from './mparticleHttpClient';

/**
 * Models for the mParticle Events API v2.
 * https://docs.mparticle.com/developers/apis/http/#example-json-request-body
 * https://docs.mparticle.com/developers/apis/json-reference/
 */
const eventBatchPath = '/events';

export const mParticleEnvironmentSchema = z.enum(['production', 'development']);

export type MParticleEnvironment = z.infer<typeof mParticleEnvironmentSchema>;

export const mParticleEventSchema = z.object({
	event_type: z.string().min(1),
	data: z.record(z.string(), z.unknown()),
});

export type MParticleEvent = z.infer<typeof mParticleEventSchema>;

export const mParticleEventBatchSchema = z.object({
	schema_version: z.number().optional(),
	source_request_id: z.string().optional(),
	environment: mParticleEnvironmentSchema,
	events: z.array(mParticleEventSchema).optional(),
	user_attributes: z.record(z.string(), z.unknown()).optional(),
	deleted_user_attributes: z.array(z.string()).optional(),
	user_identities: z.record(z.string(), z.unknown()).optional(),
	application_info: z.record(z.string(), z.unknown()).optional(),
	device_info: z.record(z.string(), z.unknown()).optional(),
	context: z.record(z.string(), z.unknown()).optional(),
	ip: z.string().optional(),
});

export type MParticleEventBatch = z.infer<typeof mParticleEventBatchSchema>;

/**
 * Uploads an event batch to the mParticle Events API.
 * https://docs.mparticle.com/developers/apis/http/#upload-an-event-batch
 *
 * Failures are rewritten so that neither credentials nor mParticle response
 * bodies can reach the logs of the calling lambda.
 */
export const uploadEventBatch = async (
	client: MParticleClient<EventsAPI>,
	batch: MParticleEventBatch,
): Promise<void> => {
	const validatedBatch = mParticleEventBatchSchema.parse(batch);

	logger.log('Sending mParticle Events API request', {
		endpoint: client.baseURL,
		eventCount: validatedBatch.events?.length ?? 0,
		sourceRequestId: validatedBatch.source_request_id,
	});

	let response: MParticleHttpResponse<undefined>;
	try {
		response = await client.post(
			eventBatchPath,
			validatedBatch,
			() => undefined,
		);
	} catch (error) {
		if (error instanceof MParticleNetworkError) {
			logger.error('mParticle Events API request failed at the network layer', {
				endpoint: client.baseURL,
			});
			throw new Error('mParticle Events API network request failed');
		}

		if (error instanceof MParticleHttpError) {
			throw new Error(
				`mParticle Events API request failed with status ${error.statusCode}`,
			);
		}

		throw error;
	}

	if (!response.success) {
		throw response.error;
	}

	logger.log('Received mParticle Events API response', {
		endpoint: client.baseURL,
		status: response.statusCode,
	});
};
