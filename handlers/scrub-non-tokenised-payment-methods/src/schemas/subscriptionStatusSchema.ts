import { z } from 'zod';

/**
 * Deliberately narrow. We only read the status and the term end date, so parsing
 * only those keeps the job working on subscriptions in states the shared schema
 * rejects.
 */
export const subscriptionStatusSchema = z.object({
	status: z.string(),
	termEndDate: z.string(),
});
