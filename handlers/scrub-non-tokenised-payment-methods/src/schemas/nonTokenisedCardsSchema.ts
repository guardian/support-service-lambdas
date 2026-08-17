import { z } from 'zod';

/**
 * Deliberately narrow. We only read each card's id and status, so parsing only
 * those keeps the job working on accounts with no default payment method, which
 * is exactly what an account looks like once we have scrubbed its default.
 */
export const nonTokenisedCardsSchema = z.object({
	creditcard: z
		.array(z.object({ id: z.string(), status: z.string() }))
		.optional(),
});
