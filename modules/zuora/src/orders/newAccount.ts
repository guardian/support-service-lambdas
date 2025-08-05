import { Currency } from '@modules/internationalisation/currency';

type CreditCardReferenceTransaction = {
	type: 'CreditCardReferenceTransaction';
	tokenId: string;
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
	paymentMethodId: string;
};
export type PaymentMethod =
	| CreditCardReferenceTransaction
	| DirectDebit
	| PayPal;

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

export type PaymentGateway<T extends PaymentMethod> =
	T extends CreditCardReferenceTransaction
		? StripePaymentGateway
		: T extends DirectDebit
			? GoCardlessPaymentGateway
			: T extends PayPal
				? PayPalPaymentGateway
				: never;

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

export type NewAccount<T extends PaymentMethod> = {
	name: string;
	currency: Currency;
	crmId: string; // Salesforce accountId
	customFields: {
		sfContactId__c: string; // Salesforce contactId
		IdentityId__c: string;
		CreatedRequestId__c: string; // Support workers requestId, used to prevent duplicates
	};
	billCycleDay: 0;
	autoPay: boolean;
	paymentGateway: PaymentGateway<T>; // Generic to make sure we will only accept payment gateways that match the payment method
	paymentMethod: T;
	billToContact: Contact;
	soldToContact?: Contact;
};

// Builder function to simplify the creation of a new account object.
//
// The structure of the new account follows the format used by support-frontend,
// for example it has the salesforce account id in the name field.
// if we want to make this more general for any reason it will be important to
// check this doesn't cause any issues with acquisitions from support.theguardian.com
export function buildNewAccountObject<T extends PaymentMethod>({
	createdRequestId,
	salesforceAccountId,
	salesforceContactId,
	identityId,
	currency,
	paymentGateway,
	paymentMethod,
	billToContact,
	soldToContact,
}: {
	createdRequestId: string;
	salesforceAccountId: string;
	salesforceContactId: string;
	identityId: string;
	currency: Currency;
	paymentGateway: PaymentGateway<T>;
	paymentMethod: T;
	billToContact: Contact;
	soldToContact?: Contact;
}): NewAccount<T> {
	return {
		name: salesforceAccountId,
		currency,
		crmId: salesforceAccountId,
		customFields: {
			sfContactId__c: salesforceContactId,
			IdentityId__c: identityId,
			CreatedRequestId__c: createdRequestId,
		},
		billCycleDay: 0,
		autoPay: true,
		paymentGateway,
		paymentMethod,
		billToContact,
		soldToContact,
	};
}
