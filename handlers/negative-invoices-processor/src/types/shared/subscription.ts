import { z } from 'zod';

export const ActiveSubscriptionResultSchema = z.object({
	hasActiveSubscription: z.boolean().optional(),
	checkForActiveSubSucceeded: z.boolean(),
	error: z.string().optional(),
});
