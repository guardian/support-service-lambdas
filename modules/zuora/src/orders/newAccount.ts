import type { IsoCurrency } from '@modules/internationalisation/currency';
import type {
	AnyPaymentMethod,
	PaymentGateway,
} from '@modules/zuora/orders/paymentMethods';

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
};

type NewAccountBase<T extends AnyPaymentMethod> = {
	name: string;
	currency: IsoCurrency;
	crmId: string; // Salesforce accountId
	customFields: {
		sfContactId__c: string; // Salesforce contactId
		IdentityId__c: string;
		CreatedRequestId__c: string; // Support workers requestId, used to prevent duplicates
		DeliveryAgent__c?: string; // Optional delivery agent for National Delivery products
	};
	billCycleDay: 0;
	autoPay: boolean;
	paymentGateway: PaymentGateway<T>; // Generic to make sure we will only accept payment gateways that match the payment method
	billToContact: Contact;
	soldToContact?: Contact & { SpecialDeliveryInstructions__c?: string };
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
	NewAccountBase<T>,
	'name' | 'crmId' | 'customFields' | 'billCycleDay' | 'autoPay'
> & {
	accountName: string;
	createdRequestId: string;
	salesforceAccountId: string;
	salesforceContactId: string;
	identityId: string;
	soldToContact?: Contact;
	deliveryInstructions?: string;
} & (
		| { paymentMethod: T; hpmCreditCardPaymentMethodId?: never }
		| { hpmCreditCardPaymentMethodId: string; paymentMethod?: never }
	);

// Builder function to simplify the creation of a new account object.
export function buildNewAccountObject<T extends AnyPaymentMethod>({
	accountName,
	createdRequestId,
	salesforceAccountId,
	salesforceContactId,
	identityId,
	currency,
	paymentGateway,
	paymentMethod,
	hpmCreditCardPaymentMethodId,
	billToContact,
	soldToContact,
	deliveryInstructions,
}: BuildNewAccountInput<T>): NewAccount<T> {
	const base: NewAccountBase<T> = {
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
		billToContact,
		soldToContact: soldToContact
			? {
					...soldToContact,
					SpecialDeliveryInstructions__c: deliveryInstructions,
				}
			: undefined,
	};
	if (paymentMethod !== undefined) {
		return { ...base, paymentMethod };
	}
	// hpmCreditCardPaymentMethodId is guaranteed non-undefined here by the union input type
	return {
		...base,
		hpmCreditCardPaymentMethodId: hpmCreditCardPaymentMethodId!,
	};
}
