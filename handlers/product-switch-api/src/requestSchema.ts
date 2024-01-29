import { z } from 'zod';

export const productSwitchRequestSchema = z.object({
	price: z.number(),
	preview: z.boolean(),
	csrUserId: z.optional(z.string()),
	caseId: z.optional(z.string()),
});

export type ProductSwitchRequestBody = z.infer<
	typeof productSwitchRequestSchema
>;
