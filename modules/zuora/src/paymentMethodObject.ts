import { z } from 'zod';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';

// Schema for GET /v1/object/payment-method/{id}
// Uses PascalCase field names as per the Zuora object API.
// See: https://developer.zuora.com/v1-api-reference/older-api/payment-methods/object_getpaymentmethod
// We have to use this older API as it is the only one which can
// successfully clone a bank transfer payment method
const bankTransferPaymentMethodSchema = z.object({
	Id: z.string(),
	Type: z.literal('BankTransfer'),
	Country: z.string(),
	BankTransferType: z.string().optional(),
	BankTransferAccountNumberMask: z.string(),
	BankCode: z.string(),
	BankTransferAccountName: z.string(),
	MandateID: z.string(),
	TokenId: z.string().optional(),
});

export type BankTransferPaymentMethod = z.infer<
	typeof bankTransferPaymentMethodSchema
>;

const creditCardReferenceTransactionPaymentMethodSchema = z.object({
	Id: z.string(),
	Type: z.literal('CreditCardReferenceTransaction'),
	Country: z.string(),
	TokenId: z.string(),
	SecondTokenId: z.string(),
});

export type CreditCardReferenceTransactionPaymentMethod = z.infer<
	typeof creditCardReferenceTransactionPaymentMethodSchema
>;

const paymentMethodObjectSchema = z.discriminatedUnion('Type', [
	bankTransferPaymentMethodSchema,
	creditCardReferenceTransactionPaymentMethodSchema,
	z.object({ Type: z.literal('CreditCard') }),
	z.object({ Type: z.literal('PayPal') }),
	z.object({ Type: z.literal('PayPalCP') }),
	z.object({ Type: z.literal('PayPalNativeEC') }),
	z.object({ Type: z.literal('PayPalEC') }),
	z.object({ Type: z.literal('PayPalAdaptive') }),
]);

export type PaymentMethodObject = z.infer<typeof paymentMethodObjectSchema>;

export const getPaymentMethodObjectById = async (
	zuoraClient: ZuoraClient,
	paymentMethodId: string,
): Promise<PaymentMethodObject> => {
	const path = `/v1/object/payment-method/${paymentMethodId}`;
	return zuoraClient.get(path, paymentMethodObjectSchema);
};
