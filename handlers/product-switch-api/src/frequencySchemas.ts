import { z } from 'zod';
import { zuoraPreviewResponseInvoiceSchema } from './schemas';

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

// Error response schema for 400/500 responses
export const frequencyChangeErrorResponseSchema = z.object({
	reasons: z.array(z.object({ message: z.string() })),
});

export type FrequencyChangeErrorResponse = z.infer<
	typeof frequencyChangeErrorResponseSchema
>;

// Success response schema for preview (200)
export const frequencyChangePreviewSuccessResponseSchema = z.object({
	previewInvoices: z.array(zuoraPreviewResponseInvoiceSchema),
	savings: z.object({
		amount: z.number(),
		currency: z.string(),
		period: z.enum(['year', 'month']),
	}),
});

export type FrequencyChangePreviewSuccessResponse = z.infer<
	typeof frequencyChangePreviewSuccessResponseSchema
>;

// Success response schema for execution (201)
export const frequencyChangeSwitchSuccessResponseSchema = z.object({
	invoiceIds: z.array(z.string()),
});

export type FrequencyChangeSwitchSuccessResponse = z.infer<
	typeof frequencyChangeSwitchSuccessResponseSchema
>;

// Union types for backward compatibility with internal processing
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
