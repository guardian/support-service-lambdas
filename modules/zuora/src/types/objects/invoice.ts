import { z } from 'zod';

export const getInvoiceSchema = z.object({
	id: z.string(),
	amount: z.number(),
	amountWithoutTax: z.number(),
	balance: z.number(),
	accountId: z.string(),
});

export type GetInvoiceResponse = z.infer<typeof getInvoiceSchema>;
