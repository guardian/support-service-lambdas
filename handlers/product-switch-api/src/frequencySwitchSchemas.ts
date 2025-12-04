import { isoCurrencySchema } from '@modules/internationalisation/schemas';
import { z } from 'zod';

export const frequencySwitchRequestSchema = z.object({
	preview: z.boolean(),
	targetBillingPeriod: z.enum(['Annual'], {
		description:
			'Target billing period - only Annual is supported (monthly to annual switch)',
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

const priceObjectSchema = z.object({
	amount: z.number(),
	period: z.enum(['year', 'month']),
});

export const frequencySwitchPreviewSuccessResponseSchema = z.object({
	currency: isoCurrencySchema,
	savings: priceObjectSchema,
	newPrice: priceObjectSchema,
	currentContribution: priceObjectSchema,
	currentDiscount: priceObjectSchema,
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
