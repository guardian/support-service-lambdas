import { z } from 'zod';
import { zuoraResponseSchema } from '../httpResponse';

export const invoiceItemAdjustmentResultSchema = z.intersection(
	zuoraResponseSchema,
	z.object({
		Id: z.string().optional(),
	}),
);
export type InvoiceItemAdjustmentType = 'Credit' | 'Charge';

export type InvoiceItemAdjustmentSourceType = 'InvoiceDetail' | 'Tax';

export type InvoiceItemAdjustmentResult = z.infer<
	typeof invoiceItemAdjustmentResultSchema
>;
