import type { Callback, Context } from 'aws-lambda';
import { handlerBaton } from '../src';
import { BatonEventRequest, BatonEventResponse } from '../src/routers/baton';

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
