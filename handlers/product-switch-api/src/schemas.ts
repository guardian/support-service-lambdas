import { z } from 'zod';

export const productSwitchRequestSchema = z.object({
	price: z.number(),
	preview: z.boolean(),
	csrUserId: z.optional(z.string()),
	caseId: z.optional(z.string()),
});

export type ProductSwitchRequestBody = z.infer<
	typeof productSwitchRequestSchema
>;

export const zuoraPreviewResponseSchema = z.object({
	success: z.boolean(),
	previewResult: z.optional(
		z.object({
			invoices: z.array(
				z.object({
					amount: z.number(),
					amountWithoutTax: z.number(),
					taxAmount: z.number(),
					targetDate: z.string(),
					invoiceItems: z.array(
						z.object({
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
						}),
					),
				}),
			),
		}),
	),
	reasons: z.optional(z.array(z.object({ message: z.string() }))),
});

export type ZuoraPreviewResponse = z.infer<typeof zuoraPreviewResponseSchema>;

export const zuoraSwitchResponseSchema = z.object({
	success: z.boolean(),
	paidAmount: z.optional(z.number()),
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
