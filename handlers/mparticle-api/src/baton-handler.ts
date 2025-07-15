import type { Handler } from 'aws-lambda';
import {
	BatonRerEventRequest,
	BatonRerEventResponse,
	batonRerRouter,
} from './routers/baton';

export const handler: Handler<
	BatonRerEventRequest,
	BatonRerEventResponse
> = async (event: BatonRerEventRequest): Promise<BatonRerEventResponse> => {
	try {
		console.debug('Processing Baton RER event');
		return batonRerRouter.routeRequest(event);
	} catch (error) {
		console.error('Baton RER handler error:', error);
		throw error; // Re-throw to trigger Lambda retry mechanism
	}
};
