import { z } from 'zod';
import { InvoiceSchema } from './invoiceSchemas';
import { RefundResultSchema } from './refund';
import { ApplyCreditToAccountBalanceAttemptSchema } from '../handlers/ApplyCreditToAccountBalance';
import { PaymentMethodResultSchema } from './paymentMethod';
import { ActiveSubscriptionResultSchema } from './subscription';

export const ProcessedInvoiceSchema = InvoiceSchema.extend({
	applyCreditToAccountBalanceAttempt: ApplyCreditToAccountBalanceAttemptSchema,
	activeSubResult: ActiveSubscriptionResultSchema.optional(),
	activePaymentMethodResult: PaymentMethodResultSchema.optional(),
	refundResult: RefundResultSchema.optional(),
});

export type ProcessedInvoice = z.infer<typeof ProcessedInvoiceSchema>;
