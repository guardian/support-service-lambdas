import type { Callback, Context } from 'aws-lambda';
import { handlerBaton } from '../index';
import type {
	BatonRerEventRequest,
	BatonRerEventResponse,
} from '../routers/baton/types-and-schemas';

export const invokeBatonRerHandler = async (
	event: BatonRerEventRequest,
): Promise<BatonRerEventResponse> => {
	const result: unknown = await handlerBaton(
		event,
		{} as Context,
		(() => {}) as Callback<unknown>,
	);
	return result as BatonRerEventResponse;
};
