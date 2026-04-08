import type { ZuoraAccount } from './types';
import { voidSchema, zuoraAccountSchema } from './types';
import type { ZuoraClient } from './zuoraClient';
import {
	PaymentGateway,
	PaymentMethod,
} from '@modules/zuora/orders/paymentMethods';
import { z } from 'zod';

const minimalSchema = z.object({
	basicInfo: z.object({
		id: z.string(),
	}),
});

type MinimalAccountResponse = z.infer<typeof minimalSchema>;

/**
 * Retrieve a Zuora account ID (a UUID) from an account number (eg. A0123456).
 * Some APIs will only work with a full ID.
 * @param zuoraClient
 * @param accountNumber
 */
export const retrieveAccountIdFromAccountNumber = async (
	zuoraClient: ZuoraClient,
	accountNumber: string,
): Promise<string> => {
	const path = `v1/accounts/${accountNumber}`;
	const account: MinimalAccountResponse = await zuoraClient.get(
		path,
		minimalSchema,
	);
	return account.basicInfo.id;
};

export const getAccount = async (
	zuoraClient: ZuoraClient,
	accountNumber: string,
): Promise<ZuoraAccount> => {
	const path = `v1/accounts/${accountNumber}`;
	return zuoraClient.get(path, zuoraAccountSchema);
};

export const deleteAccount = async (
	zuoraClient: ZuoraClient,
	accountNumber: string,
): Promise<void> => {
	const path = `/v1/accounts/${accountNumber}`;
	await zuoraClient.delete(path, voidSchema);
};

export const updateAccount = async (
	zuoraClient: ZuoraClient,
	accountNumber: string,
	payload: {
		crmId?: string;
		sfContactId__c?: string;
		defaultPaymentMethodId?: string;
		paymentGateway?: PaymentGateway<PaymentMethod>;
		autoPay?: boolean;
	},
): Promise<void> => {
	const path = `/v1/accounts/${accountNumber}`;
	const body = JSON.stringify(payload);
	await zuoraClient.put(path, body, voidSchema);
};
