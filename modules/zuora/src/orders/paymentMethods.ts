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

type PayPalCompletePayments = {
	type: 'PayPalCP';
	BAID: string;
	email: string;
};

export type PaymentMethod =
	| CreditCardReferenceTransaction
	| DirectDebit
	| PayPal
	| PayPalCompletePayments;

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

export type PaymentGateway<T extends PaymentMethod> =
	T extends CreditCardReferenceTransaction
		? StripePaymentGateway
		: T extends DirectDebit
			? GoCardlessPaymentGateway
			: T extends PayPal
				? PayPalPaymentGateway
				: T extends PayPalCompletePayments
					? PayPalCompletePaymentsPaymentGateway
					: never;
