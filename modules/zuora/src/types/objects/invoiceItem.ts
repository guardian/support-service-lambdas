import { z } from 'zod';

export const invoiceItemSchema = z.object({
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
});

export type InvoiceItem = z.infer<typeof invoiceItemSchema>;

export const getInvoiceItemsSchema = z.object({
	invoiceItems: z.array(invoiceItemSchema),
});

export type GetInvoiceItemsResponse = z.infer<typeof getInvoiceItemsSchema>;
