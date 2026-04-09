import { z } from 'zod';
import type { ClonedCreditCardReferenceTransaction } from '@modules/zuora/orders/paymentMethods';
import {
	type BankTransferPaymentMethod,
	type CreditCardReferenceTransactionPaymentMethod,
	getPaymentMethodObjectById,
} from '@modules/zuora/paymentMethodObject';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';

// Represents a Zuora payment method ID provided by the caller.
// requiresCloning: false — the PM exists but is not yet attached to any account;
//   it can be set as the default directly via updateAccount.
// requiresCloning: true — the PM is attached to an existing account and must be
//   cloned (re-created) on the new account before use.
export type ExistingPaymentMethod = {
	id: string;
	requiresCloning: boolean;
};

export type ClonePaymentMethodResult = {
	hpmCreditCardPaymentMethodId?: string;
	paymentMethod?: ClonedCreditCardReferenceTransaction;
};

const createPaymentMethodResponseSchema = z.object({
	Id: z.string(),
});

export async function cloneBankTransfer(
	bankTransfer: BankTransferPaymentMethod,
	zuoraClient: ZuoraClient,
) {
	const body = JSON.stringify({
		ExistingMandate: 'Yes',
		Type: bankTransfer.Type,
		Country: bankTransfer.Country,
		BankCode: bankTransfer.BankCode,
		BankTransferType: bankTransfer.BankTransferType,
		BankTransferAccountName: bankTransfer.BankTransferAccountName,
		BankTransferAccountNumber: bankTransfer.BankTransferAccountNumberMask,
		MandateID: bankTransfer.MandateID,
		TokenId: bankTransfer.TokenId,
	});
	const response: { Id: string } = await zuoraClient.post(
		'/v1/object/payment-method',
		body,
		createPaymentMethodResponseSchema,
	);
	return { hpmCreditCardPaymentMethodId: response.Id };
}

function cloneCreditCardReferenceTransaction(
	zuoraPaymentMethod: CreditCardReferenceTransactionPaymentMethod,
): { paymentMethod: ClonedCreditCardReferenceTransaction } {
	return {
		paymentMethod: {
			type: 'CreditCardReferenceTransaction' as const,
			tokenId: zuoraPaymentMethod.TokenId,
			secondTokenId: zuoraPaymentMethod.SecondTokenId,
		},
	};
}

// Resolves the payment method to use when creating a new account.
// - requiresCloning: false — returns the existing payment method id directly.
// - requiresCloning: true, BankTransfer — creates a payment method on the new account and returns its id.
// - requiresCloning: true, CreditCardReferenceTransaction — returns the payment method details to embed inline in the order.
// - requiresCloning: true, CreditCard/PayPal — not supported; throws an error.
export async function clonePaymentMethod(
	existingPaymentMethod: ExistingPaymentMethod,
	zuoraClient: ZuoraClient,
): Promise<ClonePaymentMethodResult> {
	if (!existingPaymentMethod.requiresCloning) {
		return { hpmCreditCardPaymentMethodId: existingPaymentMethod.id };
	}

	const zuoraPaymentMethod = await getPaymentMethodObjectById(
		zuoraClient,
		existingPaymentMethod.id,
	);

	if (zuoraPaymentMethod.Type === 'BankTransfer') {
		return await cloneBankTransfer(zuoraPaymentMethod, zuoraClient);
	} else if (zuoraPaymentMethod.Type === 'CreditCardReferenceTransaction') {
		return cloneCreditCardReferenceTransaction(zuoraPaymentMethod);
	} else {
		// Zuora does not return a full card number for CreditCard payment methods
		// or a vault token for PayPalCP payment methods so cloning is not supported.
		// We could clone older PayPal payment methods of type PayPalNativeEC but
		// the added complexity was not judged to be worth the effort
		throw new Error(
			`Unsupported payment method type for cloning: ${zuoraPaymentMethod.Type}. ` +
				`Only CreditCardReferenceTransaction and BankTransfer are supported.`,
		);
	}
}
