import { z } from 'zod';

export const InvoiceSchema = z
	.object({
		invoiceId: z.string(),
		accountId: z.string(),
		invoiceNumber: z.string(),
		invoiceBalance: z.number(),
	})
	.strict();
export type InvoiceRecord = z.infer<typeof InvoiceSchema>;

export const InvoiceRecordsArraySchema = z.array(InvoiceSchema);

//ApplyCreditToAccountBalance lambda
export type ApplyCreditToAccountBalanceInput = InvoiceRecord;

export const ApplyCreditToAccountBalanceAttemptSchema = z.object({
	Success: z.boolean(),
	error: z.string().optional(),
});

export const ApplyCreditToAccountBalanceOutputSchema = InvoiceSchema.extend({
	applyCreditToAccountBalanceAttempt: ApplyCreditToAccountBalanceAttemptSchema,
});

export type ApplyCreditToAccountBalanceOutput = z.infer<
	typeof ApplyCreditToAccountBalanceOutputSchema
>;

// CheckForActiveSub lambda
export const CheckForActiveSubInputSchema =
	ApplyCreditToAccountBalanceOutputSchema;
export type CheckForActiveSubInput = ApplyCreditToAccountBalanceOutput;

export const CheckForActiveSubAttemptSchema = z.object({
	Success: z.boolean(),
	hasActiveSub: z.boolean().optional(),
	error: z.string().optional(),
});

export const CheckForActiveSubOutputSchema =
	CheckForActiveSubInputSchema.extend({
		checkForActiveSubAttempt: CheckForActiveSubAttemptSchema,
	});

export type CheckForActiveSubOutput = z.infer<
	typeof CheckForActiveSubOutputSchema
>;

// GetPaymentMethods lambda
export const GetPaymentMethodsInputSchema = CheckForActiveSubOutputSchema;
export type GetPaymentMethodsInput = CheckForActiveSubOutput;

export const PaymentMethodSchema = z.object({
	id: z.string(),
	status: z.string(),
	type: z.string(),
	isDefault: z.boolean(),
});

export const CheckForActivePaymentMethodAttemptSchema = z.object({
	Success: z.boolean(),
	hasActivePaymentMethod: z.boolean().optional(),
	activePaymentMethods: z.array(PaymentMethodSchema).optional(),
	error: z.string().optional(),
});
export const GetPaymentMethodsOutputSchema =
	GetPaymentMethodsInputSchema.extend({
		checkForActivePaymentMethodAttempt:
			CheckForActivePaymentMethodAttemptSchema,
	});
export type GetPaymentMethodsOutput = z.infer<
	typeof GetPaymentMethodsOutputSchema
>;

//DoCreditBalanceRefund lambda
export const DoCreditBalanceRefundInputSchema = GetPaymentMethodsOutputSchema;
export type DoCreditBalanceRefundInput = z.infer<
	typeof DoCreditBalanceRefundInputSchema
>;

export const RefundAttemptSchema = z.object({
	Success: z.boolean(),
	paymentMethod: PaymentMethodSchema.optional(),
	refundAmount: z.number().optional(),
	error: z.string().optional(),
});

export const DoCreditBalanceRefundOutputSchema =
	DoCreditBalanceRefundInputSchema.extend({
		refundAttempt: RefundAttemptSchema,
	});
export type DoCreditBalanceRefundOutput = z.infer<
	typeof DoCreditBalanceRefundOutputSchema
>;

// saveResults lambda
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
