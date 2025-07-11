import { z } from 'zod';
import { InvoiceSchema } from './invoiceSchemas';
import { ApplyCreditToAccountBalanceAttemptSchema } from '../handlers/ApplyCreditToAccountBalance';
import { CheckForActiveSubAttemptSchema } from '../handlers/CheckForActiveSub';
import { CheckForActivePaymentMethodAttemptSchema } from '../handlers/GetPaymentMethods';
import { RefundAttemptSchema } from '../handlers/DoCreditBalanceRefund';

export const ProcessedInvoiceSchema = InvoiceSchema.extend({
	applyCreditToAccountBalanceAttempt: ApplyCreditToAccountBalanceAttemptSchema,
	checkForActiveSubAttempt: CheckForActiveSubAttemptSchema.optional(),
	checkForActivePaymentMethodAttempt:
		CheckForActivePaymentMethodAttemptSchema.optional(),
	refundAttempt: RefundAttemptSchema.optional(),
});

export type ProcessedInvoice = z.infer<typeof ProcessedInvoiceSchema>;
