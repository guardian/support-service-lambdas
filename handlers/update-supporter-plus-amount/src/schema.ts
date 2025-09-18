import { z } from 'zod';

export const requestBodySchema = z.object({
	newPaymentAmount: z.number(),
});

export type RequestBody = z.infer<typeof requestBodySchema>;
