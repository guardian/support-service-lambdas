import type { CountryCode } from '@modules/internationalisation/country';

export type EmailBillingPeriod = 'Annual' | 'Monthly' | 'Quarterly';

export type TaxMode = 'TaxInclusive' | 'TaxExclusive' | undefined | null;

export type PostalAddress = {
	lineOne?: string;
	lineTwo?: string;
	city?: string;
	postCode?: string;
	country: CountryCode;
};

export type EmailUser = {
	id: string;
	primaryEmailAddress: string;
	firstName: string;
	lastName: string;
	billingAddress: PostalAddress;
	deliveryAddress?: PostalAddress;
};

export type EmailPaymentMethod =
	| {
			Type: 'BankTransfer';
			BankTransferAccountName: string;
			BankTransferAccountNumber: string;
			BankCode: string;
	  }
	| {
			Type: 'CreditCardReferenceTransaction';
	  }
	| {
			Type: 'PayPal';
	  };

export type Payment = {
	date: Date;
	amount: number;
	amountWithoutTax: number;
	taxAmount: number;
};

export type EmailPaymentSchedule = {
	payments: Payment[];
};

export type EmailGiftRecipient = {
	firstName: string;
	lastName: string;
};

export type EmailDeliveryAgentDetails = {
	agentname: string;
	telephone: string;
	email: string;
	address1: string;
	address2: string;
	town: string;
	county: string;
	postcode: string;
};
