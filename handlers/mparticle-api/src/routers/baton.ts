import { handleInitiateRequest } from './baton/handle-initiate-request';
import { handleStatusRequest } from './baton/handle-status-request';
import type {
	BatonRerEventRequest,
	BatonRerEventResponse,
} from './baton/types-and-schemas';
import {
	BatonRerEventRequestSchema,
	ValidationError,
} from './baton/types-and-schemas';
import { MParticleDataSubjectClient } from '../apis/data-subject-requests';
import { MParticleEventsClient } from '../apis/events';

export function validateRequest(
	data: BatonRerEventRequest,
): BatonRerEventRequest {
	const result = BatonRerEventRequestSchema.safeParse(data);
	if (!result.success) {
		console.error('Request validation failed:', result.error);
		throw new ValidationError('Invalid request format', result.error);
	}
	return result.data;
}

export const batonRerRouter = (
	mParticleDataSubjectClient: MParticleDataSubjectClient,
	mParticleEventsClient: MParticleEventsClient,
	httpRouterBaseUrl: string,
	isProd: boolean,
) => ({
	routeRequest: async (
		event: BatonRerEventRequest,
	): Promise<BatonRerEventResponse> => {
		const validatedEvent = validateRequest(event);
		switch (validatedEvent.action) {
			case 'initiate':
				return handleInitiateRequest(
					mParticleDataSubjectClient,
					mParticleEventsClient,
					httpRouterBaseUrl,
					validatedEvent,
					isProd,
				);
			case 'status':
				return handleStatusRequest(mParticleDataSubjectClient, validatedEvent);
		}
	},
});
