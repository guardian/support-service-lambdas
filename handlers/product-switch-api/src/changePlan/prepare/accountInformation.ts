import { ZuoraAccount } from '@modules/zuora/types';
import {
	type IsoCurrency,
	isSupportedCurrency,
} from '@modules/internationalisation/currency';

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
): AccountInformation => {
	const currency = account.metrics.currency;

	if (!isSupportedCurrency(currency)) {
		// TODO move check to zod reader
		throw new Error(`Unsupported currency ${currency}`);
	}

	return {
		id: account.basicInfo.id,
		identityId: account.basicInfo.identityId,
		emailAddress: account.billToContact.workEmail,
		firstName: account.billToContact.firstName,
		lastName: account.billToContact.lastName,
		currency,
		defaultPaymentMethodId: account.billingAndPayment.defaultPaymentMethodId,
	};
};
