import { z } from 'zod';

export const previewDiscountSchema = z.object({
	discountedPrice: z.number(),
	upToPeriods: z.number(),
	upToPeriodsType: z.string(),
});

export type EligibilityCheckResponseBody = z.infer<
	typeof previewDiscountSchema
>;
