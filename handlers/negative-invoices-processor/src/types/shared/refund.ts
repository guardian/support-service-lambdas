import { zuoraResponseSchema } from '@modules/zuora/types';
import z from 'zod';

export const RefundResponseSchema = zuoraResponseSchema.extend({
	Id: z.string().optional(),
});

export type RefundResponse = z.infer<typeof RefundResponseSchema>;
