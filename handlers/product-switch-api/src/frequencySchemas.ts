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

export const frequencyChangePreviewResponseSchema = z.object({
	success: z.boolean(),
	previousBillingPeriod: z.enum(['Month', 'Annual']),
	newBillingPeriod: z.enum(['Month', 'Annual']),
	previewInvoices: z.optional(z.array(zuoraPreviewResponseInvoiceSchema)),
	reasons: z.optional(z.array(z.object({ message: z.string() }))),
	savings: z.optional(
		z.object({
			amount: z.number(),
			currency: z.string(),
			period: z.enum(['year', 'month']),
		}),
	),
});

export type FrequencyChangePreviewResponse = z.infer<
	typeof frequencyChangePreviewResponseSchema
>;

export const frequencyChangeSwitchResponseSchema = z.object({
	success: z.boolean(),
	previousBillingPeriod: z.enum(['Month', 'Annual']),
	newBillingPeriod: z.enum(['Month', 'Annual']),
	invoiceIds: z.optional(z.array(z.string())),
	reasons: z.optional(z.array(z.object({ message: z.string() }))),
});

export type FrequencyChangeSwitchResponse = z.infer<
	typeof frequencyChangeSwitchResponseSchema
>;
