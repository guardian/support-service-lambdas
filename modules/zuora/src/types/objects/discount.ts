import { z } from 'zod';

export const addDiscountPreviewSchema = z.object({
	success: z.boolean(),
	invoiceItems: z.array(
		// This looks the same as the invoice items object in billingPreviewSchema, but the call returns
		// fewer fields, so I'm defining it separately in case someone wants to add the missing fields to
		// the other object later.
		z.object({
			id: z.optional(z.string()),
			serviceStartDate: z.coerce.date(),
			serviceEndDate: z.coerce.date(),
			chargeAmount: z.number(),
			chargeName: z.string(),
			taxAmount: z.number(),
		}),
	),
});

export type AddDiscountPreview = z.infer<typeof addDiscountPreviewSchema>;
