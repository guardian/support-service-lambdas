import { z } from 'zod';

export const ZuoraGetInvoicePaymentQueryOutputSchema = z.object({
	Id: z.string(),
	InvoiceId: z.string(),
});

export const ZuoraGetInvoicePaymentQueryOutputResponseSchema = z.object({
	size: z.number(),
	records: z.array(ZuoraGetInvoicePaymentQueryOutputSchema),
	done: z.boolean(),
});
