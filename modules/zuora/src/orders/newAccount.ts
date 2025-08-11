import type { IsoCurrency } from '@modules/internationalisation/currency';

type CreditCardReferenceTransaction = {
	type: 'CreditCardReferenceTransaction';
	tokenId: string;
	secondTokenId: string;
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
export type PaymentMethod =
	| CreditCardReferenceTransaction
	| DirectDebit
	| PayPal;

//Gateway names need to match to those set in Zuora
//See: https://apisandbox.zuora.com/apps/NewGatewaySetting.do?method=list
type StripePaymentGateway =
	| 'Stripe PaymentIntents GNM Membership'
	| 'Stripe PaymentIntents GNM Membership AUS'
	| 'Stripe - Observer - Tortoise Media';
type PayPalPaymentGateway = 'PayPal Express';
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
				: never;

export type Contact = {
	firstName: string;
	lastName: string;
	workEmail: string;
	country: string;
	state?: string;
	city?: string; // There are a lot of optional fields on this object as digital products do not require a full address
	address1?: string;
	address2?: string;
	postalCode?: string;
};

export type NewAccount<T extends PaymentMethod> = {
	name: string;
	currency: IsoCurrency;
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
	soldToContact?: Contact & { SpecialDeliveryInstructions__c?: string };
};

// Builder function to simplify the creation of a new account object.
export function buildNewAccountObject<T extends PaymentMethod>({
	accountName,
	createdRequestId,
	salesforceAccountId,
	salesforceContactId,
	identityId,
	currency,
	paymentGateway,
	paymentMethod,
	billToContact,
	soldToContact,
	deliveryInstructions,
}: {
	accountName: string;
	createdRequestId: string;
	salesforceAccountId: string;
	salesforceContactId: string;
	identityId: string;
	currency: IsoCurrency;
	paymentGateway: PaymentGateway<T>;
	paymentMethod: T;
	billToContact: Contact;
	soldToContact?: Contact;
	deliveryInstructions?: string;
}): NewAccount<T> {
	return {
		name: accountName,
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
		soldToContact: soldToContact
			? {
					...soldToContact,
					SpecialDeliveryInstructions__c: deliveryInstructions,
				}
			: undefined,
	};
}
