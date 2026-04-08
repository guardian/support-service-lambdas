import { z } from 'zod';
import { DefaultPaymentMethodResponseSchema } from './types';
import type { ZuoraClient } from './zuoraClient';

// Minimal fields needed to clone a BankTransfer payment method onto a new account.
// The full BankTransferPaymentMethod type is a structural subtype of this, so
// callers passing either work correctly.
export type BankTransferCloneInput = {
	type: string;
	accountKey: string;
	accountNumber: string;
	bankCode: string;
	accountHolderInfo: AccountHolderInfo;
	mandateInfo: MandateInfo;
};

const accountHolderInfoSchema = z.object({
	accountHolderName: z.string().nullable(),
});
type AccountHolderInfo = z.infer<typeof accountHolderInfoSchema>;

const mandateInfoSchema = z.object({
	mandateId: z.string().nullable(),
});
type MandateInfo = z.infer<typeof mandateInfoSchema>;

const paymentMethodByIdSchema = z.object({
	id: z.string(),
	type: z.string(),
	// CreditCardReferenceTransaction fields
	tokenId: z.string().optional(),
	secondTokenId: z.string().optional(),
	// BankTransfer fields
	bankTransferType: z.string().optional(),
	accountNumber: z.string().optional(),
	bankCode: z.string().optional(),
	branchCode: z.string().nullish(),
	IBAN: z.string().optional(),
	accountHolderInfo: accountHolderInfoSchema.optional(),
	mandateInfo: mandateInfoSchema.optional(),
});

export type PaymentMethodById = z.infer<typeof paymentMethodByIdSchema>;

export const getPaymentMethodById = async (
	zuoraClient: ZuoraClient,
	paymentMethodId: string,
): Promise<PaymentMethodById> => {
	const path = `/v1/payment-methods/${paymentMethodId}`;
	return zuoraClient.get(path, paymentMethodByIdSchema);
};

export const getPaymentMethods = async <
	T extends z.ZodType = typeof DefaultPaymentMethodResponseSchema,
>(
	zuoraClient: ZuoraClient,
	accountId: string,
	schema?: T,
): Promise<z.infer<T>> => {
	const path = `/v1/accounts/${accountId}/payment-methods`;
	const finalSchema = schema ?? DefaultPaymentMethodResponseSchema;
	return zuoraClient.get(path, finalSchema);
};

const createPaymentMethodResponseSchema = z.object({
	id: z.string(),
});

export const createBankTransferPaymentMethod = async (
	zuoraClient: ZuoraClient,
	bankTransfer: BankTransferCloneInput,
): Promise<string> => {
	const body = JSON.stringify({
		type: bankTransfer.type,
		bankCode: bankTransfer.bankCode,
		accountNumber: bankTransfer.accountNumber,
		// The account number returned by GET /v1/accounts/{id}/payment-methods is
		// masked (e.g. ****9911). skipValidation bypasses format validation so
		// Zuora accepts it; the mandate reference identifies the real bank account.
		skipValidation: true,
		accountHolderInfo: {
			accountHolderName: bankTransfer.accountHolderInfo.accountHolderName,
		},
		mandateInfo: {
			mandateId: bankTransfer.mandateInfo.mandateId,
		},
	});
	const response: { id: string } = await zuoraClient.post(
		'/v1/payment-methods',
		body,
		createPaymentMethodResponseSchema,
	);
	return response.id;
};
