import { z } from 'zod';

export const billingPreviewInvoiceItemSchema = z.object({
	id: z.optional(z.string()),
	subscriptionNumber: z.string(),
	serviceStartDate: z.coerce.date(),
	chargeName: z.string(),
	chargeAmount: z.number(),
	taxAmount: z.number(),
});

export const billingPreviewSchema = z.object({
	accountId: z.string(),
	invoiceItems: z.array(billingPreviewInvoiceItemSchema),
});

export type BillingPreview = z.infer<typeof billingPreviewSchema>;
export type BillingPreviewInvoiceItem = z.infer<
	typeof billingPreviewInvoiceItemSchema
>;
