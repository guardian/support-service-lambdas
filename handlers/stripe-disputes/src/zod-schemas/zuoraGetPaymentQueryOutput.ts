import { z } from 'zod';

export const ZuoraGetPaymentQueryOutputSchema = z.object({
	Id: z.string(),
	ReferenceId: z.string(),
	PaymentNumber: z.string(),
	Status: z.string(),
	AccountId: z.string(),
});

export const ZuoraGetPaymentQueryOutputResponseSchema = z.object({
	size: z.number(),
	records: z.array(ZuoraGetPaymentQueryOutputSchema),
	done: z.boolean(),
});
