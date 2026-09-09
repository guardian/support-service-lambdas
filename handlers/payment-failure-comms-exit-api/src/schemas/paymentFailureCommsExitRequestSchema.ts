import { z } from 'zod';

export const paymentFailureCommsExitRequestSchema = z
	.object({
		identityId: z.string().trim().min(1),
	})
	.strict();
