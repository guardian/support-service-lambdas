import { z } from 'zod';

export const previewDiscountSchema = z.object({
	discountedPrice: z.number(),
	upToPeriods: z.number(),
	upToPeriodsType: z.string(),
	firstDiscountedPaymentDate: z.string(),
	nextNonDiscountedPaymentDate: z.string(),
});

export type EligibilityCheckResponseBody = z.infer<
	typeof previewDiscountSchema
>;

export const applyDiscountSchema = z.object({
	nextNonDiscountedPaymentDate: z.string(),
});

export type ApplyDiscountResponseBody = z.infer<typeof applyDiscountSchema>;
