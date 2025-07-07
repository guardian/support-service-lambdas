import { z } from 'zod';
import {
	ApplyCreditToAccountBalanceAttemptSchema,
	InvoiceSchema,
} from './ApplyCreditToAccountBalance';
import { CheckForActiveSubAttemptSchema } from './CheckForActiveSub';
import { RefundAttemptSchema } from './DoCreditBalanceRefund';
import { CheckForActivePaymentMethodAttemptSchema } from './GetPaymentMethods';

export const ProcessedInvoiceSchema = InvoiceSchema.extend({
	applyCreditToAccountBalanceAttempt: ApplyCreditToAccountBalanceAttemptSchema,
	checkForActiveSubAttempt: CheckForActiveSubAttemptSchema.optional(),
	checkForActivePaymentMethodAttempt:
		CheckForActivePaymentMethodAttemptSchema.optional(),
	refundAttempt: RefundAttemptSchema.optional(),
});

export const SaveResultsInputSchema = z.object({
	invoicesCount: z.number(),
	invoices: z.array(InvoiceSchema),
	processedInvoices: z.array(ProcessedInvoiceSchema),
});
export type SaveResultsInput = z.infer<typeof SaveResultsInputSchema>;
export const SaveResultsOutputSchema = SaveResultsInputSchema.extend({
	s3UploadAttemptStatus: z.string(),
	filePath: z.string().optional(),
	error: z.string().optional(),
});
export type SaveResultsOutput = z.infer<typeof SaveResultsOutputSchema>;
