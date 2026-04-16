import { z } from 'zod';
import {
	type BankTransferPaymentMethod,
	type CreditCardReferenceTransactionPaymentMethod,
	getPaymentMethodObjectById,
} from '@modules/zuora/getPaymentMethodObjectById';
import type { ClonedCreditCardReferenceTransaction } from '@modules/zuora/orders/paymentMethods';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';

// Represents a Zuora payment method ID provided by the caller.
// requiresCloning: false — the PM exists but is not yet attached to any account;
// requiresCloning: true — the PM is attached to an existing account and must be cloned before use.
export type ExistingPaymentMethod = {
	id: string;
	requiresCloning: boolean;
};

// The clonePaymentMethod function will return either an inline payment method
// object which can be passed to Zuora or an id of an existing orphan payment
// method but never both.
export type ClonedPaymentMethod =
	| {
			hpmCreditCardPaymentMethodId: string;
			paymentMethod?: never;
	  }
	| {
			paymentMethod: ClonedCreditCardReferenceTransaction;
			hpmCreditCardPaymentMethodId?: never;
	  };

const createPaymentMethodResponseSchema = z.object({
	Id: z.string(),
});

async function cloneBankTransfer(
	zuoraClient: ZuoraClient,
	bankTransfer: BankTransferPaymentMethod,
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
			type: zuoraPaymentMethod.Type,
			tokenId: zuoraPaymentMethod.TokenId,
			secondTokenId: zuoraPaymentMethod.SecondTokenId,
		},
	};
}

// Resolves the payment method to use when creating a new account.
// - requiresCloning: false — returns the existing payment method id directly.
// - requiresCloning: true, BankTransfer — creates a new orphan bank transfer payment method and returns its id.
// - requiresCloning: true, CreditCardReferenceTransaction — returns the payment method details to embed inline in the order.
// - requiresCloning: true, CreditCard/PayPal — not supported; throws an error.
export async function clonePaymentMethod(
	zuoraClient: ZuoraClient,
	existingPaymentMethod: ExistingPaymentMethod,
): Promise<ClonedPaymentMethod> {
	if (!existingPaymentMethod.requiresCloning) {
		return { hpmCreditCardPaymentMethodId: existingPaymentMethod.id };
	}

	const zuoraPaymentMethod = await getPaymentMethodObjectById(
		zuoraClient,
		existingPaymentMethod.id,
	);

	if (zuoraPaymentMethod.Type === 'BankTransfer') {
		return await cloneBankTransfer(zuoraClient, zuoraPaymentMethod);
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
