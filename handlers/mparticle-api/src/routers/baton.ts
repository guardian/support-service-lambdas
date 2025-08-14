import type { BatonS3Writer } from '../apis/batonS3Writer';
import type {
	DataSubjectAPI,
	EventsAPI,
	MParticleClient,
} from '../apis/mparticleClient';
import { handleRerInitiate } from './baton/handle-rer-initiate';
import { handleRerStatus } from './baton/handle-rer-status';
import { handleSarInitiate } from './baton/handle-sar-initiate';
import { handleSarStatus } from './baton/handle-sar-status';
import type {
	BatonEventRequest,
	BatonEventResponse,
} from './baton/types-and-schemas';
import {
	BatonEventRequestSchema,
	ValidationError,
} from './baton/types-and-schemas';

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
