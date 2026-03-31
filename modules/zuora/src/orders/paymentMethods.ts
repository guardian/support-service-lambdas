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

export type PaymentMethodType = PaymentMethod['type'] | 'CreditCard';

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

export type PaymentGateway<T extends PaymentMethod> =
	T['type'] extends keyof PaymentGatewayMap
		? PaymentGatewayMap[T['type']]
		: never;

// Represents a Zuora payment method ID provided by the caller.
// requiresCloning: false — the PM exists but is not yet attached to any account;
//   it can be set as the default directly via updateAccount.
// requiresCloning: true — the PM is attached to an existing account and must be
//   cloned (re-created) on the new account before use.
export type ExistingPaymentMethod = {
	id: string;
	type: PaymentMethodType;
	requiresCloning: boolean;
};
