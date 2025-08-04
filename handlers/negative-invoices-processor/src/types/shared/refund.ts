import { z } from 'zod';
import { PaymentMethodSchema } from '.';

export const RefundResultSchema = z.object({
	paymentMethod: PaymentMethodSchema.optional(),
	refundAmount: z.number().optional(),
	error: z.string().optional(),
});
