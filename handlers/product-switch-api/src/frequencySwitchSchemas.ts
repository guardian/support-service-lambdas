import { z } from 'zod';
import { zuoraPreviewResponseInvoiceSchema } from './schemas';

export const frequencySwitchRequestSchema = z.object({
	preview: z.boolean(),
	targetBillingPeriod: z.enum(['Month', 'Annual'], {
		description: 'Desired billing period for the subscription after the switch',
	}),
	csrUserId: z.optional(z.string()),
	caseId: z.optional(z.string()),
});

export type FrequencySwitchRequestBody = z.infer<
	typeof frequencySwitchRequestSchema
>;

export const frequencySwitchErrorResponseSchema = z.object({
	reasons: z.array(z.object({ message: z.string() })),
});

export type FrequencySwitchErrorResponse = z.infer<
	typeof frequencySwitchErrorResponseSchema
>;

export const frequencySwitchPreviewSuccessResponseSchema = z.object({
	previewInvoices: z.array(zuoraPreviewResponseInvoiceSchema),
	savings: z.object({
		amount: z.number(),
		currency: z.string(),
		period: z.enum(['year', 'month']),
	}),
	newPrice: z.object({
		amount: z.number(),
		currency: z.string(),
		period: z.enum(['year', 'month']),
	}),
	currentContribution: z.object({
		amount: z.number(),
		currency: z.string(),
		period: z.enum(['year', 'month']),
	}),
	currentDiscount: z.object({
		amount: z.number(),
		currency: z.string(),
		period: z.enum(['year', 'month']),
	}),
});

export type FrequencySwitchPreviewSuccessResponse = z.infer<
	typeof frequencySwitchPreviewSuccessResponseSchema
>;

export const frequencySwitchSuccessResponseSchema = z.object({
	invoiceIds: z.array(z.string()),
});

export type FrequencySwitchSuccessResponse = z.infer<
	typeof frequencySwitchSuccessResponseSchema
>;

export const frequencySwitchPreviewResponseSchema = z.union([
	frequencySwitchPreviewSuccessResponseSchema,
	frequencySwitchErrorResponseSchema,
]);

export type FrequencySwitchPreviewResponse = z.infer<
	typeof frequencySwitchPreviewResponseSchema
>;

export const frequencySwitchResponseSchema = z.union([
	frequencySwitchSuccessResponseSchema,
	frequencySwitchErrorResponseSchema,
]);

export type FrequencySwitchResponse = z.infer<
	typeof frequencySwitchResponseSchema
>;
