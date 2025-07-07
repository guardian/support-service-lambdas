import {
	ApplyCreditToAccountBalanceAttemptSchema,
	CheckForActiveSubAttemptSchema,
	CheckForActivePaymentMethodAttemptSchema,
	RefundAttemptSchema,
} from '../handlers';
import { InvoiceSchema } from './invoiceSchemas';

export const ProcessedInvoiceSchema = InvoiceSchema.extend({
	applyCreditToAccountBalanceAttempt: ApplyCreditToAccountBalanceAttemptSchema,
	checkForActiveSubAttempt: CheckForActiveSubAttemptSchema.optional(),
	checkForActivePaymentMethodAttempt:
		CheckForActivePaymentMethodAttemptSchema.optional(),
	refundAttempt: RefundAttemptSchema.optional(),
});
