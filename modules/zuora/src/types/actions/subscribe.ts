import { z } from 'zod';
import { zuoraResponseSchema } from '../httpResponse';

export const zuoraSubscribeResponseSchema = z.intersection(
	zuoraResponseSchema,
	z.object({
		SubscriptionNumber: z.string(),
		AccountNumber: z.string(),
	}),
);

export type ZuoraSubscribeResponse = z.infer<
	typeof zuoraSubscribeResponseSchema
>;
