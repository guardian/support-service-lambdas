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
export const ApplyCreditToAccountBalanceOutputSchema = InvoiceSchema.extend({
	applyCreditToAccountBalanceAttempt: z.object({
		Success: z.boolean(),
		error: z.string().optional(),
	}),
});

export type ApplyCreditToAccountBalanceOutput = z.infer<
	typeof ApplyCreditToAccountBalanceOutputSchema
>;

// CheckForActiveSub lambda
export const CheckForActiveSubInputSchema =
	ApplyCreditToAccountBalanceOutputSchema;
export type CheckForActiveSubInput = ApplyCreditToAccountBalanceOutput;

export const CheckForActiveSubOutputSchema =
	CheckForActiveSubInputSchema.extend({
		checkForActiveSubAttempt: z.object({
			Success: z.boolean(),
			hasActiveSub: z.boolean().optional(),
			error: z.string().optional(),
		}),
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

export const GetPaymentMethodsOutputSchema =
	GetPaymentMethodsInputSchema.extend({
		checkForActivePaymentMethodAttempt: z.object({
			Success: z.boolean(),
			hasActivePaymentMethod: z.boolean().optional(),
			activePaymentMethods: z.array(PaymentMethodSchema).optional(),
			error: z.string().optional(),
		}),
	});
export type GetPaymentMethodsOutput = z.infer<
	typeof GetPaymentMethodsOutputSchema
>;

//DoCreditBalanceRefund lambda
export const DoCreditBalanceRefundInputSchema = GetPaymentMethodsOutputSchema;
export type DoCreditBalanceRefundInput = z.infer<
	typeof DoCreditBalanceRefundInputSchema
>;

export const DoCreditBalanceRefundOutputSchema =
	DoCreditBalanceRefundInputSchema.extend({
		refundAttempt: z.object({
			Success: z.boolean(),
			paymentMethod: PaymentMethodSchema.optional(),
			error: z.string().optional(),
		}),
	});
export type DoCreditBalanceRefundOutput = z.infer<
	typeof DoCreditBalanceRefundOutputSchema
>;

//to do reconcile this with the other types that have been built up so far
export const ApplyCreditToAccountBalanceAttemptSchema = z.object({
	Success: z.boolean(),
});

export const RefundAttemptSchema = z.object({
	Success: z.boolean(),
	paymentMethod: PaymentMethodSchema.optional(),
});

export const ProcessedInvoiceSchema = InvoiceSchema.extend({
	hasActiveSub: z.boolean().optional(),
	applyCreditToAccountBalanceAttempt: ApplyCreditToAccountBalanceAttemptSchema,
	hasActivePaymentMethod: z.boolean().optional(),
	activePaymentMethods: z.array(PaymentMethodSchema).optional(),
	refundAttempt: RefundAttemptSchema.optional(),
	errorDetail: z.string().optional(),
});
