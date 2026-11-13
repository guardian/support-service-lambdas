import type { Handler } from 'aws-lambda';
import { z } from 'zod';
import { getAppConfig } from './config';
import {
	createMParticleClient,
	type EventsApiRequest,
	sendEvents,
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

export type SendEvents = (payload: EventsApiRequest) => Promise<void>;

export const parseEventsApiRequest = (event: unknown): EventsApiRequest => {
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
	send: SendEvents,
): Promise<void> => {
	const payload = parseEventsApiRequest(event);
	await send(payload);
};

export const handler: Handler<unknown, void> = async (event) => {
	const payload = parseEventsApiRequest(event);
	const config = await getAppConfig();
	const client = createMParticleClient(config);
	await sendEvents(client, payload);
};
