import { z } from 'zod';

export const requestBodySchema = z.object({
	newPaymentAmount: z.number(),
});
