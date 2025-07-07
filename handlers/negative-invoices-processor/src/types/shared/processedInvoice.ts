import { z } from 'zod';
import {
	ApplyCreditToAccountBalanceAttemptSchema,
	CheckForActiveSubAttemptSchema,
	CheckForActivePaymentMethodAttemptSchema,
	RefundAttemptSchema,
} from './attemptSchemas';
import { InvoiceSchema } from './invoiceSchemas';

export const ProcessedInvoiceSchema = InvoiceSchema.extend({
	applyCreditToAccountBalanceAttempt: ApplyCreditToAccountBalanceAttemptSchema,
	checkForActiveSubAttempt: CheckForActiveSubAttemptSchema.optional(),
	checkForActivePaymentMethodAttempt:
		CheckForActivePaymentMethodAttemptSchema.optional(),
	refundAttempt: RefundAttemptSchema.optional(),
});

export type ProcessedInvoice = z.infer<typeof ProcessedInvoiceSchema>;
