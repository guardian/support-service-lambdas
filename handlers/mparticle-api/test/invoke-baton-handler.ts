import type { Context } from 'aws-lambda';
import { handlerBaton } from '../src';
import type {
	BatonEventRequest,
	BatonEventResponse,
} from '../src/routers/baton';

export const invokeBatonHandler = async (
	event: BatonEventRequest,
): Promise<BatonEventResponse> => {
	const result: unknown = await handlerBaton(event, {} as Context, () => {});
	return result as BatonEventResponse;
};
