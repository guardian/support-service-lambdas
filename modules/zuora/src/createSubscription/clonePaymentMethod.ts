import type { ClonedCreditCardReferenceTransaction } from '@modules/zuora/orders/paymentMethods';
import {
	createBankTransferPaymentMethod,
	PaymentMethodById,
} from '@modules/zuora/paymentMethod';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { updateAccount } from '@modules/zuora/account';
import { generateBillingDocuments } from '@modules/zuora/invoice';
import dayjs from 'dayjs';
import { createPaymentRun } from '@modules/zuora/payment';

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

export async function cloneBankTransfer(
	accountKey: string,
	zuoraPaymentMethod: PaymentMethodById,
	runBilling: boolean,
	collectPayment: boolean,
	zuoraClient: ZuoraClient,
) {
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

	// Create an orphan payment method then assign it to the provided account key.
	const paymentMethodIdForAccount = await createBankTransferPaymentMethod(
		zuoraClient,
		{
			accountKey,
			type: zuoraPaymentMethod.type,
			accountNumber,
			bankCode,
			accountHolderInfo: { accountHolderName },
			mandateInfo: { mandateId },
		},
	);
	await updateAccount(zuoraClient, accountKey, {
		defaultPaymentMethodId: paymentMethodIdForAccount,
		paymentGateway: 'GoCardless',
		autoPay: true,
	});
	if (runBilling) {
		await generateBillingDocuments(zuoraClient, accountKey, dayjs());
	}
	if (collectPayment) {
		await createPaymentRun(zuoraClient, accountKey, dayjs());
	}
}

function cloneCreditCardReferenceTransaction(
	zuoraPaymentMethod: PaymentMethodById,
) {
	if (!zuoraPaymentMethod.tokenId || !zuoraPaymentMethod.secondTokenId) {
		throw new Error(
			`CreditCardReferenceTransaction payment method ${zuoraPaymentMethod.id} is missing tokenId or secondTokenId`,
		);
	}
	return {
		paymentMethod: {
			type: 'CreditCardReferenceTransaction' as const,
			tokenId: zuoraPaymentMethod.tokenId,
			secondTokenId: zuoraPaymentMethod.secondTokenId,
		},
	};
}

// Resolves the payment method to use when creating a new account.
// - requiresCloning: false — returns the existing payment method id directly.
// - requiresCloning: true, Bacs — creates an orphan payment method and returns its id.
// - requiresCloning: true, CreditCardReferenceTransaction — returns the payment method details to embed inline in the order.
// - requiresCloning: true, CreditCard/PayPal — not supported; throws an error.
export async function clonePaymentMethod(
	existingPaymentMethod: ExistingPaymentMethod,
	zuoraPaymentMethod: PaymentMethodById,
): Promise<ClonePaymentMethodResult | undefined> {
	if (!existingPaymentMethod.requiresCloning) {
		return { hpmCreditCardPaymentMethodId: existingPaymentMethod.id };
	}

	if (zuoraPaymentMethod.type === 'Bacs') {
		return undefined; // For bank transfer we need to create the new account first and then clone the payment method
	} else if (zuoraPaymentMethod.type === 'CreditCardReferenceTransaction') {
		return cloneCreditCardReferenceTransaction(zuoraPaymentMethod);
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
