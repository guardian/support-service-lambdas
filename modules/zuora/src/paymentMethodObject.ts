import { z } from 'zod';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';

// Minimal fields needed to clone a BankTransfer payment method onto a new account.
// The full BankTransferPaymentMethod type is a structural subtype of this, so
// callers passing either work correctly.
// AccountId is the Zuora internal account ID (not the account number/key).
export type BankTransferCloneInput = {
	Type: string;
	AccountId: string;
	Country: string;
	BankTransferAccountNumber: string;
	BankCode: string;
	BankTransferAccountName: string | null;
	MandateID: string | null;
	TokenId?: string;
};

// Schema for GET /v1/object/payment-method/{id}
// Uses PascalCase field names as per the Zuora object API.
// See: https://developer.zuora.com/v1-api-reference/older-api/payment-methods/object_getpaymentmethod
const paymentMethodByIdSchema = z.object({
	Id: z.string(),
	Type: z.string(),
	Country: z.string(),
	// CreditCardReferenceTransaction fields
	TokenId: z.string().optional(),
	SecondTokenId: z.string().optional(),
	// BankTransfer fields
	BankTransferType: z.string().optional(),
	BankTransferAccountNumberMask: z.string().optional(),
	BankCode: z.string().optional(),
	BranchCode: z.string().nullish(),
	IBAN: z.string().optional(),
	BankTransferAccountName: z.string().nullish(),
	MandateID: z.string().nullish(),
});

export type PaymentMethodById = z.infer<typeof paymentMethodByIdSchema>;

export const getPaymentMethodById = async (
	zuoraClient: ZuoraClient,
	paymentMethodId: string,
): Promise<PaymentMethodById> => {
	const path = `/v1/object/payment-method/${paymentMethodId}`;
	return zuoraClient.get(path, paymentMethodByIdSchema);
};

// Schema for POST /v1/object/payment-method response
const createPaymentMethodResponseSchema = z.object({
	Id: z.string(),
	Success: z.boolean(),
});

export const createBankTransferPaymentMethod = async (
	zuoraClient: ZuoraClient,
	bankTransfer: BankTransferCloneInput,
): Promise<string> => {
	const body = JSON.stringify({
		ExistingMandate: 'Yes',
		Type: bankTransfer.Type,
		Country: bankTransfer.Country,
		BankCode: bankTransfer.BankCode,
		BankTransferType: 'DirectDebitUK',
		BankTransferAccountName: bankTransfer.BankTransferAccountName,
		BankTransferAccountNumber: bankTransfer.BankTransferAccountNumber,
		AccountId: bankTransfer.AccountId,
		MandateID: bankTransfer.MandateID,
		TokenId: bankTransfer.TokenId,
	});
	const response: { Id: string; Success: boolean } = await zuoraClient.post(
		'/v1/object/payment-method',
		body,
		createPaymentMethodResponseSchema,
	);
	return response.Id;
};
