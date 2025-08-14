import { z } from 'zod';
import type { BatonS3Writer } from '../services/batonS3Writer';
import type {
	DataSubjectAPI,
	EventsAPI,
	MParticleClient,
} from '../services/mparticleClient';
import {
	BatonSarEventInitiateRequestSchema,
	BatonSarEventInitiateResponseSchema,
	handleSarInitiate,
} from './baton/access/handleInitiate';
import {
	BatonSarEventStatusRequestSchema,
	BatonSarEventStatusResponseSchema,
	handleSarStatus,
} from './baton/access/handleStatus';
import {
	BatonRerEventInitiateRequestSchema,
	BatonRerEventInitiateResponseSchema,
	handleRerInitiate,
} from './baton/erasure/handleInitiate';
import {
	BatonRerEventStatusRequestSchema,
	BatonRerEventStatusResponseSchema,
	handleRerStatus,
} from './baton/erasure/handleStatus';

export const BatonEventRequestSchema = z.union([
	BatonRerEventInitiateRequestSchema,
	BatonRerEventStatusRequestSchema,
	BatonSarEventInitiateRequestSchema,
	BatonSarEventStatusRequestSchema,
]);
export const BatonEventResponseSchema = z.union([
	BatonRerEventInitiateResponseSchema,
	BatonRerEventStatusResponseSchema,
	BatonSarEventInitiateResponseSchema,
	BatonSarEventStatusResponseSchema,
]);
export type BatonEventRequest = z.infer<typeof BatonEventRequestSchema>;
export type BatonEventResponse = z.infer<typeof BatonEventResponseSchema>;

export function validateRequest(data: BatonEventRequest): BatonEventRequest {
	const result = BatonEventRequestSchema.safeParse(data);
	if (!result.success) {
		console.error('Request validation failed:', result.error);
		throw new ValidationError('Invalid request format', result.error);
	}
	return result.data;
}

export const batonRerRouter = (
	mParticleDataSubjectClient: MParticleClient<DataSubjectAPI>,
	mParticleEventsAPIClient: MParticleClient<EventsAPI>,
	isProd: boolean,
	batonS3Writer: BatonS3Writer,
) => ({
	routeRequest: async (
		event: BatonEventRequest,
	): Promise<BatonEventResponse> => {
		const validatedEvent = validateRequest(event);
		switch (validatedEvent.requestType) {
			case 'SAR':
				switch (validatedEvent.action) {
					case 'initiate':
						return handleSarInitiate(
							mParticleDataSubjectClient,
							isProd,
							validatedEvent,
						);
					case 'status':
						return handleSarStatus(
							mParticleDataSubjectClient,
							batonS3Writer,
							validatedEvent.initiationReference,
						);
				}
				break; // unreachable - only needed for no-fallthrough rule
			case 'RER':
				switch (validatedEvent.action) {
					case 'initiate':
						return handleRerInitiate(
							mParticleDataSubjectClient,
							mParticleEventsAPIClient,
							isProd,
							validatedEvent,
						);
					case 'status':
						return handleRerStatus(mParticleDataSubjectClient, validatedEvent);
				}
		}
	},
});

class ValidationError extends Error {
	constructor(
		message: string,
		public readonly errors: z.ZodError,
	) {
		super(message);
		this.name = 'ValidationError';
	}
}
