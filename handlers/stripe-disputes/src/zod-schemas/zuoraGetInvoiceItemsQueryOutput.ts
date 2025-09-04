import { z } from 'zod';

export const ZuoraGetInvoiceItemQueryOutputSchema = z.object({
	Id: z.string(),
	SubscriptionId: z.string().nullable(),
	SubscriptionNumber: z.string().nullable(),
});

export const ZuoraGetInvoiceItemQueryOutputResponseSchema = z.object({
	size: z.number(),
	records: z.array(ZuoraGetInvoiceItemQueryOutputSchema),
	done: z.boolean(),
});
