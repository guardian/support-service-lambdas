import type { IsoCurrency } from '@modules/internationalisation/currency';
import type { PaymentGateway } from '@modules/zuora/orders/paymentGateways';
import type { AnyPaymentMethod } from '@modules/zuora/orders/paymentMethods';

// This file contains types for creating a new account via the Orders API.

export type Contact = {
	firstName: string;
	lastName: string;
	workEmail: string;
	country: string;
	state?: string | null;
	city?: string; // There are a lot of optional fields on this object as digital products do not require a full address
	address1?: string;
	address2?: string | null;
	postalCode?: string;
	SpecialDeliveryInstructions__c?: string;
};

type NewAccountBase<T extends AnyPaymentMethod> = {
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
	billToContact: Contact;
	soldToContact?: Contact;
};

// The structure expected by Zuora in the Orders request
export type NewAccount<T extends AnyPaymentMethod> =
	| (NewAccountBase<T> & {
			paymentMethod: T;
			hpmCreditCardPaymentMethodId?: never;
	  })
	| (NewAccountBase<T> & {
			hpmCreditCardPaymentMethodId: string;
			paymentMethod?: never;
	  });

// Input type for the helper function
type BuildNewAccountInput<T extends AnyPaymentMethod> = Omit<
	NewAccount<T>,
	'name' | 'crmId' | 'customFields' | 'billCycleDay' | 'autoPay'
> & {
	accountName: string;
	createdRequestId: string;
	salesforceAccountId: string;
	salesforceContactId: string;
	identityId: string;
	deliveryInstructions: string | undefined;
};

// Builder function to simplify the creation of a new account object.
export function buildNewAccountObject<T extends AnyPaymentMethod>(
	input: BuildNewAccountInput<T>,
): NewAccount<T> {
	const soldToContactWithDeliveryInstructions = input.soldToContact && {
		...input.soldToContact,
		SpecialDeliveryInstructions__c: input.deliveryInstructions,
	};
	const base: NewAccountBase<T> = {
		name: input.accountName,
		currency: input.currency,
		crmId: input.salesforceAccountId,
		customFields: {
			sfContactId__c: input.salesforceContactId,
			IdentityId__c: input.identityId,
			CreatedRequestId__c: input.createdRequestId,
		},
		billCycleDay: 0,
		autoPay: true,
		paymentGateway: input.paymentGateway,
		billToContact: input.billToContact,
		soldToContact: soldToContactWithDeliveryInstructions,
	};
	if (input.paymentMethod !== undefined) {
		return { ...base, paymentMethod: input.paymentMethod };
	}
	if (input.hpmCreditCardPaymentMethodId !== undefined) {
		return {
			...base,
			hpmCreditCardPaymentMethodId: input.hpmCreditCardPaymentMethodId,
		};
	}
	// This shouldn't happen because BuildNewAccountInput is a union which
	// must contain either a paymentMethod or hpmCreditCardPaymentMethodId,
	// but apparently TS can't figure that out here.
	throw new Error(
		'Either paymentMethod or hpmCreditCardPaymentMethodId must be provided',
	);
}
