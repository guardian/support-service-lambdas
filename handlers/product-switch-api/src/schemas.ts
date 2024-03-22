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
	previewResult: z.object({
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
						chargeDescription: z.string(),
						chargeName: z.string(),
						chargeNumber: z.null(),
						processingType: z.string(),
						productName: z.string(),
						productRatePlanChargeId: z.string(),
						unitPrice: z.number(),
						subscriptionNumber: z.string(),
						orderLineItemNumber: z.null(),
						additionalInfo: z.object({
							quantity: z.number(),
							unitOfMeasure: z.string(),
							numberOfDeliveries: z.number(),
						}),
					}),
				),
			}),
		),
	}),
});
