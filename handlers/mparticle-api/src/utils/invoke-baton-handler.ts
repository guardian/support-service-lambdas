import type { Callback, Context } from 'aws-lambda';
import { handlerBaton } from '../index';
import type {
	BatonEventRequest,
	BatonEventResponse,
} from '../routers/baton/types-and-schemas';

export const invokeBatonHandler = async (
	event: BatonEventRequest,
): Promise<BatonEventResponse> => {
	const result: unknown = await handlerBaton(
		event,
		{} as Context,
		(() => {}) as Callback<unknown>,
	);
	return result as BatonEventResponse;
};
