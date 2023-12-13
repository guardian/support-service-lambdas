import { z } from 'zod';

export const previewDiscountSchema = z.object({
	valid: z.boolean(),
	discountedPrice: z.number().optional(),
});

export type EligibilityCheckResponseBody = z.infer<
	typeof previewDiscountSchema
>;
