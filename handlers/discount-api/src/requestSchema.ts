import { z } from 'zod';

export const applyDiscountSchema = z.object({
	subscriptionNumber: z.string(),
	preview: z.boolean(),
});

export type ApplyDiscountRequestBody = z.infer<typeof applyDiscountSchema>;
