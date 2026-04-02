import { z } from 'zod';

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

export type AnyPaymentMethod = PaymentMethod | ClonedCreditCardReferenceTransaction;

//Gateway names need to match to those set in Zuora
//See: https://apisandbox.zuora.com/apps/NewGatewaySetting.do?method=list
const stripePaymentGatewaySchema = z.union([
	z.literal('Stripe PaymentIntents GNM Membership'),
	z.literal('Stripe PaymentIntents GNM Membership AUS'),
	z.literal('Stripe - Observer - Tortoise Media'),
]);
type StripePaymentGateway = z.infer<typeof stripePaymentGatewaySchema>;

const payPalPaymentGatewaySchema = z.literal('PayPal Express');
type PayPalPaymentGateway = z.infer<typeof payPalPaymentGatewaySchema>;

const payPalCompletePaymentsPaymentGatewaySchema = z.literal(
	'PayPal Complete Payments',
);
type PayPalCompletePaymentsPaymentGateway = z.infer<
	typeof payPalCompletePaymentsPaymentGatewaySchema
>;

const goCardlessPaymentGatewaySchema = z.union([
	z.literal('GoCardless'),
	z.literal('GoCardless - Observer - Tortoise Media'),
]);
type GoCardlessPaymentGateway = z.infer<typeof goCardlessPaymentGatewaySchema>;

type PaymentGatewayMap = {
	CreditCardReferenceTransaction: StripePaymentGateway;
	Bacs: GoCardlessPaymentGateway;
	PayPalNativeEC: PayPalPaymentGateway;
	PayPalCP: PayPalCompletePaymentsPaymentGateway;
};

export type PaymentGateway<
	T extends PaymentMethod | ClonedCreditCardReferenceTransaction,
> = T['type'] extends keyof PaymentGatewayMap
	? PaymentGatewayMap[T['type']]
	: never;

export const paymentGatewaySchema = z.union([
	stripePaymentGatewaySchema,
	payPalPaymentGatewaySchema,
	payPalCompletePaymentsPaymentGatewaySchema,
	goCardlessPaymentGatewaySchema,
]);

// Represents a Zuora payment method ID provided by the caller.
// requiresCloning: false — the PM exists but is not yet attached to any account;
//   it can be set as the default directly via updateAccount.
// requiresCloning: true — the PM is attached to an existing account and must be
//   cloned (re-created) on the new account before use.
export type ExistingPaymentMethod = {
	id: string;
	requiresCloning: boolean;
};
