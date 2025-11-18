import { z } from 'zod';

export const invoiceItemAdjustmentResultSchema = z.object({
	Id: z.string().optional(),
});

export type InvoiceItemAdjustmentType = 'Credit' | 'Charge';

export type InvoiceItemAdjustmentSourceType = 'InvoiceDetail' | 'Tax';

export type InvoiceItemAdjustmentResult = z.infer<
	typeof invoiceItemAdjustmentResultSchema
>;
