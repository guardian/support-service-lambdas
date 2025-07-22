import { z } from 'zod';
import { InvoiceSchema } from './invoiceSchemas';
import { RefundResultSchema } from './refund';
import { ApplyCreditToAccountBalanceAttemptSchema } from '../handlers/ApplyCreditToAccountBalance';
import { CheckForActiveSubAttemptSchema } from '../handlers/CheckForActiveSub';
import { PaymentMethodResultSchema } from './paymentMethod';

export const ProcessedInvoiceSchema = InvoiceSchema.extend({
	applyCreditToAccountBalanceAttempt: ApplyCreditToAccountBalanceAttemptSchema,
	checkForActiveSubAttempt: CheckForActiveSubAttemptSchema.optional(),
	activePaymentMethodResult: PaymentMethodResultSchema.optional(),
	refundResult: RefundResultSchema.optional(),
});

export type ProcessedInvoice = z.infer<typeof ProcessedInvoiceSchema>;
