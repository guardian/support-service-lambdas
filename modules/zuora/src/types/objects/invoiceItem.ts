import { z } from 'zod';
import { zuoraResponseSchema } from '../httpResponse';

export const getInvoiceItemsSchema = zuoraResponseSchema.extend({
	invoiceItems: z.array(
		z.object({
			id: z.string(),
			productRatePlanChargeId: z.string(),
			availableToCreditAmount: z.number(),
			taxationItems: z.object({
				data: z.array(
					z.object({
						id: z.string(),
						availableToCreditAmount: z.number(),
					}),
				),
			}),
		}),
	),
});

export type GetInvoiceItemsResponse = z.infer<typeof getInvoiceItemsSchema>;
