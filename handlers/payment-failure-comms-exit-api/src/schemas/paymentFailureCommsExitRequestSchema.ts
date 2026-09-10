import { z } from 'zod';

export const paymentFailureCommsExitRequestSchema = z
	.object({
		identityId: z.string().min(1).regex(/^\S+$/),
	})
	.strict();
