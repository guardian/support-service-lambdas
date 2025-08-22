import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';

import { EventsAPI, MParticleClient } from '../../services/mparticleClient';
import {
	EventBatch,
	uploadAnEventBatch,
} from '../../apis/events/uploadAnEventBatch';

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

export function uploadEventBatchHandler(
	mParticleEventsAPIClient: MParticleClient<EventsAPI>,
) {
	return async (
		event: APIGatewayProxyEvent,
		parsed: { path: unknown; body: EventBatch },
	): Promise<APIGatewayProxyResult> => {
		await uploadAnEventBatch(mParticleEventsAPIClient, parsed.body);
		return {
			statusCode: 201,
			body: '',
		};
	};
}
