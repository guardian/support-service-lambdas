import type { IsoCountry } from '@modules/internationalisation/country';

export type EmailBillingPeriod = 'Annual' | 'Monthly' | 'Quarterly';

export type PostalAddress = {
	lineOne?: string;
	lineTwo?: string;
	city?: string;
	postCode?: string;
	country: IsoCountry;
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

export type EmailPaymentSchedule = {
	payments: Array<{ date: Date; amount: number }>;
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
