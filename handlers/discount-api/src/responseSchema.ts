import { z } from 'zod';

export const previewDiscountResponseSchema = z.object({
	discountedPrice: z.number(),
	upToPeriods: z.number(),
	upToPeriodsType: z.string(),
	discountPercentage: z.number(),
	firstDiscountedPaymentDate: z.string(),
	nextNonDiscountedPaymentDate: z.string(),
	nonDiscountedPayments: z.array(
		z.object({ amount: z.number(), date: z.string() }),
	),
});

export type EligibilityCheckResponseBody = z.infer<
	typeof previewDiscountResponseSchema
>;

export const applyDiscountResponseSchema = z.object({
	nextNonDiscountedPaymentDate: z.string(),
});

export type ApplyDiscountResponseBody = z.infer<
	typeof applyDiscountResponseSchema
>;
