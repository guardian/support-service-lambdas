import { z } from 'zod';

export const zuoraSubscribeResponseSchema = z.array(
	z.object({
		SubscriptionNumber: z.string(),
		AccountNumber: z.string(),
	}),
);

export type ZuoraSubscribeResponse = z.infer<
	typeof zuoraSubscribeResponseSchema
>;
