import { zuoraResponseSchema } from '@modules/zuora/types';
import { z } from 'zod';

export const SubscriptionResponseSchema = zuoraResponseSchema;
export type SubscriptionResponse = z.infer<typeof SubscriptionResponseSchema>;

export const ActiveSubscriptionResultSchema = z.object({
	checkForActiveSubAttempt: SubscriptionResponseSchema,
	hasActiveSubscription: z.boolean().optional(),
	error: z.string().optional(),
});

export type ActiveSubscriptionResult = z.infer<
	typeof ActiveSubscriptionResultSchema
>;
