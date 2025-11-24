import { z } from 'zod';
import { successOrFailureSchema } from './successOrFailureSchema';

export const SubscriptionResponseSchema = successOrFailureSchema;
export type SubscriptionResponse = z.infer<typeof SubscriptionResponseSchema>;

export const ActiveSubscriptionResultSchema = z.object({
	checkForActiveSubAttempt: SubscriptionResponseSchema,
	hasActiveSubscription: z.boolean().optional(),
	error: z.string().optional(),
});

export type ActiveSubscriptionResult = z.infer<
	typeof ActiveSubscriptionResultSchema
>;
