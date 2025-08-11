import { z } from 'zod';
import { zuoraResponseSchema } from '../httpResponse';

export const getInvoiceSchema = z.intersection(
	zuoraResponseSchema,
	z.object({
		id: z.string(),
		amount: z.number(),
		amountWithoutTax: z.number(),
		balance: z.number(),
		accountId: z.string(),
	}),
);
export type GetInvoiceResponse = z.infer<typeof getInvoiceSchema>;
