import { z } from 'zod';

export const applyDiscountSchema = z.object({
	subscriptionNumber: z.string(),
	discountProductRatePlanId: z.string(),
});

export type ApplyDiscountRequestBody = z.infer<typeof applyDiscountSchema>;
