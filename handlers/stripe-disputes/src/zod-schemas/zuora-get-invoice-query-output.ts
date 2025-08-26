import { z } from 'zod';

export const ZuoraGetInvoiceQueryOutputSchema = z.object({
	Id: z.string(),
	InvoiceNumber: z.string(),
	Status: z.string(),
});

export const ZuoraGetInvoiceQueryOutputResponseSchema = z.object({
	size: z.number(),
	records: z.array(ZuoraGetInvoiceQueryOutputSchema),
	done: z.boolean(),
});
