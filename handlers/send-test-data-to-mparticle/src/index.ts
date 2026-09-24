import type { Handler } from 'aws-lambda';
import { z } from 'zod';
import { getAppConfig } from './config';
import {
	MParticleClient,
	type EventsApiRequest,
} from './mparticleClient';

const eventsApiRequestSchema = z
	.object({
		user_identities: z
			.object({
				customer_id: z.string().refine((value) => value.trim().length > 0),
			})
			.passthrough(),
		user_attributes: z.record(z.string(), z.unknown()),
		environment: z.enum(['production', 'development']).optional(),
	})
	.passthrough();

export type HandlerResult = {
	statusCode: number;
};

export type SendEvents = (payload: EventsApiRequest) => Promise<number>;

export const parseEventsApiRequest = (
	event: unknown,
): EventsApiRequest => {
	const parsedEvent = eventsApiRequestSchema.safeParse(event);
	if (!parsedEvent.success) {
		throw new Error('Invalid mParticle Events API input');
	}

	return {
		...parsedEvent.data,
		environment: 'development',
	};
};

export const processEvent = async (
	event: unknown,
	sendEvents: SendEvents,
): Promise<HandlerResult> => {
	const payload = parseEventsApiRequest(event);
	const statusCode = await sendEvents(payload);
	return { statusCode };
};

export const handler: Handler<unknown, HandlerResult> = async (event) => {
	const payload = parseEventsApiRequest(event);
	const config = await getAppConfig();
	const client = MParticleClient.create(config);
	const statusCode = await client.sendEvents(payload);

	return { statusCode };
};
