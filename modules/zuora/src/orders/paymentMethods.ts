export type CreditCardReferenceTransaction = {
	type: 'CreditCardReferenceTransaction';
	tokenId: string;
	secondTokenId: string;
	cardNumber: string;
	cardType?: string;
	expirationMonth: number;
	expirationYear: number;
};

export type DirectDebit = {
	type: 'Bacs';
	accountHolderInfo: {
		accountHolderName: string;
	};
	accountNumber: string;
	bankCode: string;
};

type PayPal = {
	type: 'PayPalNativeEC';
	BAID: string;
	email: string;
};

type PayPalCompletePaymentsWithBAID = {
	type: 'PayPalCP';
	BAID: string;
	email: string;
};

type PayPalCompletePaymentsWithPaymentToken = {
	type: 'PayPalCP';
	tokens: {
		gatewayType: 'PayPalCP';
		tokenId: string;
	};
	email: string;
};

export type PaymentMethod =
	| CreditCardReferenceTransaction
	| DirectDebit
	| PayPal
	| PayPalCompletePaymentsWithPaymentToken
	| PayPalCompletePaymentsWithBAID;

// A CreditCardReferenceTransaction with only the fields needed to clone it onto a new account.
// Distinct from CreditCardReferenceTransaction, which includes card display fields (cardNumber,
// expirationMonth, etc.) that are not available or needed during cloning.
export type ClonedCreditCardReferenceTransaction = {
	type: 'CreditCardReferenceTransaction';
	tokenId: string;
	secondTokenId: string;
};

// An existing payment method which is unattached to an account and can be added
// to an account with the hpmCreditCardPaymentMethodId parameter in the Orders API.
export type ExistingPaymentMethod = {
	type: 'ExistingPaymentMethod';
	hpmCreditCardPaymentMethodId: string;
};

export type AnyPaymentMethod =
	| PaymentMethod
	| ClonedCreditCardReferenceTransaction
	| ExistingPaymentMethod;
