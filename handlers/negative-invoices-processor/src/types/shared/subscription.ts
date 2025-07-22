import { zuoraResponseSchema } from '@modules/zuora/types';
import z from 'zod';

export const SubscriptionResponseSchema = zuoraResponseSchema;
export type SubscriptionResponse = z.infer<typeof SubscriptionResponseSchema>;

export const ActiveSubscriptionResultSchema = SubscriptionResponseSchema.extend(
	{
		checkForActiveSubAttempt: SubscriptionResponseSchema,
		hasActiveSubscription: z.boolean().optional(),
	},
);

export type ActiveSubscriptionResult = z.infer<
	typeof ActiveSubscriptionResultSchema
>;
