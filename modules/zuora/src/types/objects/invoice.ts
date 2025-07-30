import { z } from 'zod';
import { zuoraResponseSchema } from '../httpResponse';

export const getInvoiceSchema = zuoraResponseSchema.extend({
	id: z.string(),
	amount: z.number(),
	accountNumber: z.string(),
	amountWithoutTax: z.number(),
	balance: z.number(),
	accountId: z.string(),
});

export type GetInvoiceResponse = z.infer<typeof getInvoiceSchema>;
