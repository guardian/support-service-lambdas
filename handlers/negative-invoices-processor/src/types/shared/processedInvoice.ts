import { z } from 'zod';
import { InvoiceSchema } from './invoiceSchemas';
import { RefundResponseSchema } from './refund';
import { ApplyCreditToAccountBalanceAttemptSchema } from '../handlers/ApplyCreditToAccountBalance';
import { CheckForActiveSubAttemptSchema } from '../handlers/CheckForActiveSub';
import { CheckForActivePaymentMethodAttemptSchema } from './paymentMethod';

export const ProcessedInvoiceSchema = InvoiceSchema.extend({
	applyCreditToAccountBalanceAttempt: ApplyCreditToAccountBalanceAttemptSchema,
	checkForActiveSubAttempt: CheckForActiveSubAttemptSchema.optional(),
	checkForActivePaymentMethodAttempt:
		CheckForActivePaymentMethodAttemptSchema.optional(),
	refundResult: RefundResponseSchema.optional(),
});

export type ProcessedInvoice = z.infer<typeof ProcessedInvoiceSchema>;
