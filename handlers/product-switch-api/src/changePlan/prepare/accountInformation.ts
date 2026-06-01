import { type IsoCurrency } from '@modules/internationalisation/currency';
import type { ZuoraAccount } from '@modules/zuora/types';

export type PaymentMethodType =
	| 'BankTransfer'
	| 'PayPal'
	| 'CreditCardReferenceTransaction';

export type AccountInformation = {
	id: string; // create payment
	identityId: string; // email, supporter product data
	emailAddress: string; // email
	firstName: string; // email
	lastName: string; // email
	currency: IsoCurrency; // email
	defaultPaymentMethodId: string; // create payment
	paymentMethodType: PaymentMethodType; // email
};
export const getAccountInformation = (
	account: ZuoraAccount,
): AccountInformation => ({
	id: account.basicInfo.id,
	identityId: account.basicInfo.identityId,
	emailAddress: account.billToContact.workEmail,
	firstName: account.billToContact.firstName,
	lastName: account.billToContact.lastName,
	currency: account.metrics.currency,
	defaultPaymentMethodId: account.billingAndPayment.defaultPaymentMethodId,
	paymentMethodType: gatewayToType[account.billingAndPayment.paymentGateway],
});

const gatewayToType = {
	['GoCardless - Observer - Tortoise Media']: 'BankTransfer',
	['PayPal Complete Payments']: 'PayPal',
	['Stripe Bank Transfer - GNM Membership']: 'BankTransfer',
	['Stripe PaymentIntents GNM Membership AUS']:
		'CreditCardReferenceTransaction',
	['PayPal - Observer - Tortoise Media']: 'PayPal',
	['Stripe - Observer - Tortoise Media']: 'CreditCardReferenceTransaction',
	['PayPal Express']: 'PayPal',
	['GoCardless']: 'BankTransfer',
	['Stripe PaymentIntents GNM Membership']: 'CreditCardReferenceTransaction',
} as const;
