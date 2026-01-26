import type {
	PreviewOrderRequest} from '@modules/zuora/orders/orderRequests';
import {
	previewOrderRequest
} from '@modules/zuora/orders/orderRequests';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import z from 'zod';

const zuoraPreviewResponseInvoiceItemSchema = z.object({
	serviceStartDate: z.string(),
	serviceEndDate: z.string(),
	amountWithoutTax: z.number(),
	taxAmount: z.number(),
	chargeName: z.string(),
	processingType: z.string(),
	productName: z.string(),
	productRatePlanChargeId: z.string(),
	unitPrice: z.number(),
	subscriptionNumber: z.string(),
});
export type ZuoraPreviewResponseInvoiceItem = z.infer<
	typeof zuoraPreviewResponseInvoiceItemSchema
>;
const zuoraPreviewResponseInvoiceSchema = z.object({
	amount: z.number(),
	amountWithoutTax: z.number(),
	taxAmount: z.number(),
	targetDate: z.string(),
	invoiceItems: z.array(zuoraPreviewResponseInvoiceItemSchema),
});
export type ZuoraPreviewResponseInvoice = z.infer<
	typeof zuoraPreviewResponseInvoiceSchema
>;
export const zuoraPreviewResponseSchema = z.object({
	previewResult: z.optional(
		z.object({
			invoices: z.array(zuoraPreviewResponseInvoiceSchema),
		}),
	),
	reasons: z.optional(z.array(z.object({ message: z.string() }))),
});
export type ZuoraPreviewResponse = z.infer<typeof zuoraPreviewResponseSchema>;

export function doPreviewInvoices(
	zuoraClient: ZuoraClient,
	orderRequest: PreviewOrderRequest,
): Promise<ZuoraPreviewResponse> {
	return previewOrderRequest(
		zuoraClient,
		orderRequest,
		zuoraPreviewResponseSchema,
	);
}
