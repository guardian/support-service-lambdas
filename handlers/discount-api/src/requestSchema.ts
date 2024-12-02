import { z } from 'zod';

export const applyDiscountSchema = z.object({
	subscriptionNumber: z.string(),
});

export type ApplyDiscountRequestBody = z.infer<typeof applyDiscountSchema>;

export const sendEmailSchema = z.object({
	identityId: z.string(),
	emailAddress: z.string(),
});

export type SendEmailRequestBody = z.infer<typeof sendEmailSchema>;
