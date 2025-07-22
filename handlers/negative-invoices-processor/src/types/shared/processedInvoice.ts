import { z } from 'zod';
import { ApplyCreditToAccountBalanceResultSchema } from '.';
import { InvoiceSchema } from '.';
import { PaymentMethodResultSchema } from './paymentMethod';
import { RefundResultSchema } from './refund';
import { ActiveSubscriptionResultSchema } from './subscription';

export const ProcessedInvoiceSchema = InvoiceSchema.extend({
	applyCreditToAccountBalanceResult: ApplyCreditToAccountBalanceResultSchema,
	activeSubResult: ActiveSubscriptionResultSchema.optional(),
	activePaymentMethodResult: PaymentMethodResultSchema.optional(),
	refundResult: RefundResultSchema.optional(),
});

export type ProcessedInvoice = z.infer<typeof ProcessedInvoiceSchema>;
