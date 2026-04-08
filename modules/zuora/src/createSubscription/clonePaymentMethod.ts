import type { ClonedCreditCardReferenceTransaction } from '@modules/zuora/orders/paymentMethods';
import {
	createBankTransferPaymentMethod,
	PaymentMethodById,
} from '@modules/zuora/paymentMethodObject';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import {
	retrieveAccountIdFromAccountNumber,
	updateAccount,
} from '@modules/zuora/account';
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
	accountNumber: string,
	zuoraPaymentMethod: PaymentMethodById,
	runBilling: boolean,
	collectPayment: boolean,
	zuoraClient: ZuoraClient,
) {
	const { BankTransferAccountNumberMask, BankCode, TokenId, Country } =
		zuoraPaymentMethod;
	const accountHolderName = zuoraPaymentMethod.BankTransferAccountName;
	const mandateId = zuoraPaymentMethod.MandateID;
	if (!BankTransferAccountNumberMask) {
		throw new Error(
			`Bacs payment method ${zuoraPaymentMethod.Id} is missing BankTransferAccountNumber`,
		);
	}
	if (!BankCode) {
		throw new Error(
			`Bacs payment method ${zuoraPaymentMethod.Id} is missing BankCode`,
		);
	}
	if (!accountHolderName) {
		throw new Error(
			`Bacs payment method ${zuoraPaymentMethod.Id} is missing BankTransferAccountName`,
		);
	}
	if (!mandateId) {
		throw new Error(
			`Bacs payment method ${zuoraPaymentMethod.Id} is missing MandateID`,
		);
	}

	const accountId = await retrieveAccountIdFromAccountNumber(
		zuoraClient,
		accountNumber,
	);

	// Create a payment method on the new account using the object API.
	const paymentMethodIdForAccount = await createBankTransferPaymentMethod(
		zuoraClient,
		{
			AccountId: accountId,
			Country: Country,
			Type: zuoraPaymentMethod.Type,
			BankTransferAccountNumber: BankTransferAccountNumberMask,
			BankCode,
			BankTransferAccountName: accountHolderName,
			MandateID: mandateId,
			TokenId: TokenId,
		},
	);
	await updateAccount(zuoraClient, accountNumber, {
		defaultPaymentMethodId: paymentMethodIdForAccount,
		paymentGateway: 'GoCardless',
		autoPay: true,
	});
	if (runBilling) {
		await generateBillingDocuments(zuoraClient, accountNumber, dayjs());
	}
	if (collectPayment) {
		await createPaymentRun(zuoraClient, accountNumber, dayjs());
	}
}

function cloneCreditCardReferenceTransaction(
	zuoraPaymentMethod: PaymentMethodById,
) {
	if (!zuoraPaymentMethod.TokenId || !zuoraPaymentMethod.SecondTokenId) {
		throw new Error(
			`CreditCardReferenceTransaction payment method ${zuoraPaymentMethod.Id} is missing TokenId or SecondTokenId`,
		);
	}
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
// - requiresCloning: true, Bacs — creates a payment method on the new account and returns its id.
// - requiresCloning: true, CreditCardReferenceTransaction — returns the payment method details to embed inline in the order.
// - requiresCloning: true, CreditCard/PayPal — not supported; throws an error.
export async function clonePaymentMethod(
	existingPaymentMethod: ExistingPaymentMethod,
	zuoraPaymentMethod: PaymentMethodById,
): Promise<ClonePaymentMethodResult | undefined> {
	if (!existingPaymentMethod.requiresCloning) {
		return { hpmCreditCardPaymentMethodId: existingPaymentMethod.id };
	}

	if (zuoraPaymentMethod.Type === 'BankTransfer') {
		return undefined; // For bank transfer we need to create the new account first and then clone the payment method
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
