import { type IsoCurrency } from '@modules/internationalisation/currency';
import type { ZuoraAccount } from '@modules/zuora/types';

export type AccountInformation = {
	id: string; // create payment
	identityId: string; // email, supporter product data
	emailAddress: string; // email
	firstName: string; // email
	lastName: string; // email
	currency: IsoCurrency; // email
	defaultPaymentMethodId: string; // create payment
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
});
