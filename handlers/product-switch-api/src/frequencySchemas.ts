import { z } from 'zod';
import { zuoraPreviewResponseInvoiceSchema } from './schemas';

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

export const frequencyChangeErrorResponseSchema = z.object({
	reasons: z.array(z.object({ message: z.string() })),
});

export type FrequencyChangeErrorResponse = z.infer<
	typeof frequencyChangeErrorResponseSchema
>;

export const frequencyChangePreviewSuccessResponseSchema = z.object({
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
});

export type FrequencyChangePreviewSuccessResponse = z.infer<
	typeof frequencyChangePreviewSuccessResponseSchema
>;

export const frequencyChangeSwitchSuccessResponseSchema = z.object({
	invoiceIds: z.array(z.string()),
});

export type FrequencyChangeSwitchSuccessResponse = z.infer<
	typeof frequencyChangeSwitchSuccessResponseSchema
>;

export const frequencyChangePreviewResponseSchema = z.union([
	frequencyChangePreviewSuccessResponseSchema,
	frequencyChangeErrorResponseSchema,
]);

export type FrequencyChangePreviewResponse = z.infer<
	typeof frequencyChangePreviewResponseSchema
>;

export const frequencyChangeSwitchResponseSchema = z.union([
	frequencyChangeSwitchSuccessResponseSchema,
	frequencyChangeErrorResponseSchema,
]);

export type FrequencyChangeSwitchResponse = z.infer<
	typeof frequencyChangeSwitchResponseSchema
>;
