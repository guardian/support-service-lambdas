import type { PreviewOrderRequest } from '@modules/zuora/orders/orderRequests';
import { previewOrderRequest } from '@modules/zuora/orders/orderRequests';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import z from 'zod';

const zuoraPreviewResponseInvoiceItemSchema = z
	.object({
		serviceEndDate: z.string(),
		amountWithoutTax: z.number(),
		taxAmount: z.number(),
		productRatePlanChargeId: z.string(),
		unitPrice: z.number(),
	})
	.transform(({ amountWithoutTax, taxAmount, unitPrice, ...rest }) => ({
		...rest,
		unitPriceMinorUnits: unitPrice * 100,
		amountMinorUnits: amountWithoutTax * 100 + taxAmount * 100,
	}));

export type ZuoraPreviewResponseInvoiceItem = z.infer<
	typeof zuoraPreviewResponseInvoiceItemSchema
>;
const zuoraPreviewResponseInvoiceSchema = z.object({
	amount: z.number(),
	invoiceItems: z.array(zuoraPreviewResponseInvoiceItemSchema).nonempty(),
});
export type ZuoraPreviewResponseInvoice = z.infer<
	typeof zuoraPreviewResponseInvoiceSchema
>;
export const zuoraPreviewResponseSchema = z.object({
	previewResult: z.object({
		invoices: z.array(zuoraPreviewResponseInvoiceSchema),
	}),
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
