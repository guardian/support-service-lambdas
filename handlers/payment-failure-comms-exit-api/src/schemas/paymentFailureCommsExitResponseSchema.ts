import { z } from 'zod';

export const paymentFailureCommsExitResponseSchema = z.object({
	status: z.literal('sent'),
});
