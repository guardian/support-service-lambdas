import { z } from 'zod';
import { zuoraResponseSchema } from '../httpResponse';

export const getInvoiceSchema = zuoraResponseSchema.extend({
	id: z.string(),
	amount: z.number(),
	amountWithoutTax: z.number(),
	balance: z.number(),
});

export type GetInvoiceResponse = z.infer<typeof getInvoiceSchema>;
