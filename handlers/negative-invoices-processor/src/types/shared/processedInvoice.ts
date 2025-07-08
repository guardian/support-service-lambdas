import { z } from 'zod';
import { InvoiceSchema } from './invoiceSchemas';
import { ApplyCreditToAccountBalanceAttemptSchema } from '../handlers/ApplyCreditToAccountBalance';
import {
	CheckForActivePaymentMethodAttemptSchema,
	CheckForActiveSubAttemptSchema,
	RefundAttemptSchema,
} from '../handlers';

export const ProcessedInvoiceSchema = InvoiceSchema.extend({
	applyCreditToAccountBalanceAttempt: ApplyCreditToAccountBalanceAttemptSchema,
	checkForActiveSubAttempt: CheckForActiveSubAttemptSchema.optional(),
	checkForActivePaymentMethodAttempt:
		CheckForActivePaymentMethodAttemptSchema.optional(),
	refundAttempt: RefundAttemptSchema.optional(),
});

export type ProcessedInvoice = z.infer<typeof ProcessedInvoiceSchema>;
