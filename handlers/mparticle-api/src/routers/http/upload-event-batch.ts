import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';
import type { EventBatch } from '../../../interfaces/event-batch';
import { uploadAnEventBatch } from '../../apis/events';
import { EventsAPI, MParticleClient } from '../../apis/mparticleClient';

export const eventBatchParser = {
	body: z.object({
		events: z.array(
			z.object({
				/** Custom data payload for the event */
				data: z.record(z.string(), z.unknown()),

				/** Type identifier for the event */
				eventType: z.string(),
			}),
		),
		deviceInfo: z.record(z.string(), z.unknown()),
		userAttributes: z.record(z.string(), z.unknown()),
		deletedUserAttributes: z.array(z.string()),
		userIdentities: z.record(z.string(), z.unknown()),
		applicationInfo: z.record(z.string(), z.unknown()),
		schemaVersion: z.number(),
		environment: z.enum(['production', 'development']),
		context: z.record(z.string(), z.unknown()),
		ip: z.string(),
	}),
};

export function uploadEventBatchHandler(
	mParticleEventsAPIClient: MParticleClient<EventsAPI>,
) {
	return async (
		event: APIGatewayProxyEvent,
		parsed: { path: unknown; body: EventBatch },
	): Promise<APIGatewayProxyResult> => {
		return {
			statusCode: 201,
			body: JSON.stringify(
				await uploadAnEventBatch(mParticleEventsAPIClient, parsed.body),
			),
		};
	};
}
