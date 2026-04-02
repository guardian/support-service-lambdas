import type { ClonedCreditCardReferenceTransaction } from '@modules/zuora/orders/paymentMethods';
import {
	createBankTransferPaymentMethod,
	getPaymentMethodById,
} from '@modules/zuora/paymentMethod';
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

// Resolves the payment method to use when creating a new account.
// - requiresCloning: false — returns the existing payment method id directly.
// - requiresCloning: true, Bacs — creates an orphan payment method and returns its id.
// - requiresCloning: true, CreditCardReferenceTransaction — returns the payment method details to embed inline in the order.
// - requiresCloning: true, CreditCard/PayPal — not supported; throws an error.
export async function clonePaymentMethod(
	zuoraClient: ZuoraClient,
	existingPaymentMethod: ExistingPaymentMethod,
): Promise<ClonePaymentMethodResult> {
	if (!existingPaymentMethod.requiresCloning) {
		return { hpmCreditCardPaymentMethodId: existingPaymentMethod.id };
	}

	const zuoraPaymentMethod = await getPaymentMethodById(
		zuoraClient,
		existingPaymentMethod.id,
	);

	if (zuoraPaymentMethod.type === 'Bacs') {
		const { accountNumber, bankCode } = zuoraPaymentMethod;
		const accountHolderName =
			zuoraPaymentMethod.accountHolderInfo?.accountHolderName;
		const mandateId = zuoraPaymentMethod.mandateInfo?.mandateId;
		if (!accountNumber) {
			throw new Error(
				`Bacs payment method ${zuoraPaymentMethod.id} is missing accountNumber`,
			);
		}
		if (!bankCode) {
			throw new Error(
				`Bacs payment method ${zuoraPaymentMethod.id} is missing bankCode`,
			);
		}
		if (!accountHolderName) {
			throw new Error(
				`Bacs payment method ${zuoraPaymentMethod.id} is missing accountHolderInfo.accountHolderName`,
			);
		}
		if (!mandateId) {
			throw new Error(
				`Bacs payment method ${zuoraPaymentMethod.id} is missing mandateInfo.mandateId`,
			);
		}

		// Create an orphan payment method (no accountKey), then assign it via hpmCreditCardPaymentMethodId.
		const paymentMethodIdForAccount = await createBankTransferPaymentMethod(
			zuoraClient,
			{
				type: zuoraPaymentMethod.type,
				accountNumber,
				bankCode,
				accountHolderInfo: { accountHolderName },
				mandateInfo: { mandateId },
			},
		);
		return { hpmCreditCardPaymentMethodId: paymentMethodIdForAccount };
	} else if (zuoraPaymentMethod.type === 'CreditCardReferenceTransaction') {
		if (!zuoraPaymentMethod.tokenId || !zuoraPaymentMethod.secondTokenId) {
			throw new Error(
				`CreditCardReferenceTransaction payment method ${zuoraPaymentMethod.id} is missing tokenId or secondTokenId`,
			);
		}
		return {
			paymentMethod: {
				type: zuoraPaymentMethod.type,
				tokenId: zuoraPaymentMethod.tokenId,
				secondTokenId: zuoraPaymentMethod.secondTokenId,
			},
		};
	} else {
		// Zuora does not return a full card number for CreditCard payment methods
		// or a vault token for PayPalCP payment methods so cloning is not supported.
		// We could clone older PayPal payment methods of type PayPalNativeEC but
		// the added complexity was not judged to be worth the effort
		throw new Error(
			`Unsupported payment method type for cloning: ${zuoraPaymentMethod.type}. ` +
				`Only CreditCardReferenceTransaction and BankTransfer are supported.`,
		);
	}
}
