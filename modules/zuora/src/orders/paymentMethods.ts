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

export type AnyPaymentMethod =
	| PaymentMethod
	| ClonedCreditCardReferenceTransaction;

//Gateway names need to match to those set in Zuora
//See: https://apisandbox.zuora.com/apps/NewGatewaySetting.do?method=list
type StripePaymentGateway =
	| 'Stripe PaymentIntents GNM Membership'
	| 'Stripe PaymentIntents GNM Membership AUS'
	| 'Stripe - Observer - Tortoise Media';

type PayPalPaymentGateway = 'PayPal Express';

type PayPalCompletePaymentsPaymentGateway = 'PayPal Complete Payments';

type GoCardlessPaymentGateway =
	| 'GoCardless'
	| 'GoCardless - Observer - Tortoise Media';

type PaymentGatewayMap = {
	CreditCardReferenceTransaction: StripePaymentGateway;
	Bacs: GoCardlessPaymentGateway;
	PayPalNativeEC: PayPalPaymentGateway;
	PayPalCP: PayPalCompletePaymentsPaymentGateway;
};

export type PaymentGateway<T extends AnyPaymentMethod> =
	T['type'] extends keyof PaymentGatewayMap
		? PaymentGatewayMap[T['type']]
		: never;
