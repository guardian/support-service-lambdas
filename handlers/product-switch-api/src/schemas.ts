import { z } from 'zod';

export const productSwitchRequestSchema = z.object({
	preview: z.boolean(),
	newAmount: z.optional(z.number().positive()),
	csrUserId: z.optional(z.string()),
	caseId: z.optional(z.string()),
	applyDiscountIfAvailable: z.optional(z.boolean()),
});

export type ProductSwitchRequestBody = z.infer<
	typeof productSwitchRequestSchema
>;

export const zuoraPreviewResponseInvoiceItemSchema = z.object({
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

export const zuoraPreviewResponseInvoiceSchema = z.object({
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
	success: z.boolean(),
	previewResult: z.optional(
		z.object({
			invoices: z.array(zuoraPreviewResponseInvoiceSchema),
		}),
	),
	reasons: z.optional(z.array(z.object({ message: z.string() }))),
});

export type ZuoraPreviewResponse = z.infer<typeof zuoraPreviewResponseSchema>;

export const zuoraSwitchResponseSchema = z.object({
	success: z.boolean(),
	invoiceIds: z.optional(z.array(z.string())),
	reasons: z.optional(z.array(z.object({ message: z.string() }))),
});

export type ZuoraSwitchResponse = z.infer<typeof zuoraSwitchResponseSchema>;

export const zuoraGetAmendmentResponseSchema = z.object({
	success: z.boolean(),
	id: z.optional(z.string()),
	status: z.optional(z.string()),
	type: z.optional(z.string()),
	customerAcceptanceDate: z.optional(z.string()),
	reasons: z.optional(
		z.array(z.object({ code: z.number(), message: z.string() })),
	),
});

export type ZuoraGetAmendmentResponse = z.infer<
	typeof zuoraGetAmendmentResponseSchema
>;

// Frequency change (monthly <-> annual) request schema.
export const frequencyChangeRequestSchema = z.object({
	preview: z.boolean(),
	targetBillingPeriod: z.enum(['Month', 'Annual'], {
		description: 'Desired billing period for the subscription after the change',
	}),
	csrUserId: z.optional(z.string()),
	caseId: z.optional(z.string()),
});

export type FrequencyChangeRequestBody = z.infer<
	typeof frequencyChangeRequestSchema
>;

// Simplified response used for both preview and execution paths of frequency change.
export const frequencyChangeResponseSchema = z.object({
	success: z.boolean(),
	mode: z.enum(['preview', 'execute']),
	previousBillingPeriod: z.enum(['Month', 'Annual']),
	newBillingPeriod: z.enum(['Month', 'Annual']),
	//
	invoiceIds: z.optional(z.array(z.string())),
	previewInvoices: z.optional(z.array(zuoraPreviewResponseInvoiceSchema)),
	reasons: z.optional(z.array(z.object({ message: z.string() }))),
});

export type FrequencyChangeResponse = z.infer<
	typeof frequencyChangeResponseSchema
>;
