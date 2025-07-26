import { Currency } from '@modules/internationalisation/currency';

//Gateway names need to match to those set in Zuora
//See: https://apisandbox.zuora.com/apps/NewGatewaySetting.do?method=list
type StripePaymentGateway =
	| 'Stripe Gateway 1'
	| 'Stripe Gateway AUD'
	| 'Stripe PaymentIntents Default'
	| 'Stripe PaymentIntents AUD'
	| 'Stripe - Observer - Tortoise Media';
type PayPalPaymentGateway = 'PayPal Express';
type GoCardlessPaymentGateway =
	| 'GoCardless'
	| 'GoCardless - Observer - Tortoise Media'
	| 'GoCardless - Zuora Instance';
export type PaymentGateway =
	| StripePaymentGateway
	| PayPalPaymentGateway
	| GoCardlessPaymentGateway;

type CreditCardReferenceTransaction = {
	type: 'CreditCardReferenceTransaction';
	tokenId: string;
};
type DirectDebit = {
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
	paymentMethodId: string;
};
export type PaymentMethod =
	| CreditCardReferenceTransaction
	| DirectDebit
	| PayPal;

type Contact = {
	firstName: string;
	lastName: string;
	workEmail: string;
	country: string;
	state: string;
	city: string;
	address1: string;
	address2?: string;
	postalCode: string;
};

export type NewAccount = {
	name: string;
	currency: Currency;
	billCycleDay: number;
	autoPay: boolean;
	paymentGateway: PaymentGateway;
	paymentMethod: PaymentMethod;
	billToContact: Contact;
	soldToContact?: Contact;
};
