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

export const batonRerRouter = {
	routeRequest: async (
		event: BatonRerEventRequest,
	): Promise<BatonRerEventResponse> => {
		const validatedEvent = validateRequest(event);
		switch (validatedEvent.action) {
			case 'initiate':
				return handleInitiateRequest(validatedEvent);
			case 'status':
				return handleStatusRequest(validatedEvent);
		}
	},
};
