import { z } from 'zod';
import { penceSchema } from './money';

export const subscriptionInvoiceItemSchema = z.object({
	Id: z.string(),
	InvoiceId: z.string(),
	ChargeDate: z.string(),
	ChargeAmount: penceSchema,
	TaxAmount: penceSchema,
});

export type SubscriptionInvoiceItem = z.output<
	typeof subscriptionInvoiceItemSchema
>;
