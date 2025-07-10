import type { Callback, Context } from 'aws-lambda';
import { handler } from '..';
import type {
	BatonRerEventRequest,
	BatonRerEventResponse,
} from '../routers/baton';

export const invokeBatonRerHandler = async (
	event: BatonRerEventRequest,
): Promise<BatonRerEventResponse> => {
	const result: unknown = await handler(
		event,
		{} as Context,
		(() => {}) as Callback<unknown>,
	);
	return result as BatonRerEventResponse;
};
