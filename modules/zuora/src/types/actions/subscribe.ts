import { z } from 'zod';
import { zuoraResponseSchema } from '../httpResponse';

export const zuoraSubscribeResponseSchema = z.array(
	zuoraResponseSchema.extend({
		SubscriptionNumber: z.string(),
		AccountNumber: z.string(),
	}),
);

export type ZuoraSubscribeResponse = z.infer<
	typeof zuoraSubscribeResponseSchema
>;
