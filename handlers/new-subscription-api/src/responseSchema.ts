import { z } from 'zod';

export const createSubscriptionResponseSchema = z.object({
	orderNumber: z.string(),
	accountNumber: z.string(),
	subscriptionNumbers: z.array(z.string()),
	invoiceNumbers: z.array(z.string()).optional(),
	paymentNumber: z.string().optional(),
	paidAmount: z.number().optional(),
});

export type CreateSubscriptionResponse = z.infer<
	typeof createSubscriptionResponseSchema
>;
