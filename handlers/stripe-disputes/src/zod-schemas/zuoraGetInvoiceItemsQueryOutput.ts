import { z } from 'zod';

export const ZuoraGetInvoiceItemQueryOutputSchema = z.object({
	Id: z.string(),
	SubscriptionId: z.string(),
	SubscriptionNumber: z.string(),
});

export const ZuoraGetInvoiceItemQueryOutputResponseSchema = z.object({
	size: z.number(),
	records: z.array(ZuoraGetInvoiceItemQueryOutputSchema),
	done: z.boolean(),
});
