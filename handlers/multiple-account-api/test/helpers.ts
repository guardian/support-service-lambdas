import type { ZuoraAccount, ZuoraSubscription } from '@modules/zuora/types';

export const makeSubscription = (accountNumber: string): ZuoraSubscription =>
	({
		accountNumber,
	}) as unknown as ZuoraSubscription;

export const makeAccount = (
	firstName: string,
	lastName: string,
	workEmail: string,
): ZuoraAccount =>
	({
		billToContact: { firstName, lastName, workEmail, zipCode: 'N1 9GU' },
	}) as unknown as ZuoraAccount;
