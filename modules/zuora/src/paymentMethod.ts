import { z } from 'zod';
import type { BankTransferPaymentMethod } from './types';
import { DefaultPaymentMethodResponseSchema } from './types';
import type { ZuoraClient } from './zuoraClient';

export const getPaymentMethods = async <
	T extends z.ZodType = typeof DefaultPaymentMethodResponseSchema,
>(
	zuoraClient: ZuoraClient,
	accountId: string,
	schema?: T,
): Promise<z.infer<T>> => {
	const path = `/v1/accounts/${accountId}/payment-methods`;
	const finalSchema = schema ?? DefaultPaymentMethodResponseSchema;
	return zuoraClient.get(path, finalSchema);
};

const createPaymentMethodResponseSchema = z.object({
	id: z.string(),
});

export const createBankTransferPaymentMethod = async (
	zuoraClient: ZuoraClient,
	accountKey: string,
	bankTransfer: BankTransferPaymentMethod,
): Promise<string> => {
	const body = JSON.stringify({
		accountKey,
		type: bankTransfer.type,
		bankCode: bankTransfer.bankCode,
		accountNumber: bankTransfer.accountNumber,
		skipValidation: true,
		accountHolderInfo: {
			accountHolderName:
				bankTransfer.accountHolderInfo.accountHolderName ?? undefined,
		},
		mandateInfo: {
			mandateId: bankTransfer.mandateInfo.mandateId,
			mandateReason: bankTransfer.mandateInfo.mandateReason ?? undefined,
			mandateStatus: bankTransfer.mandateInfo.mandateStatus ?? undefined,
		},
	});
	const response: { id: string } = await zuoraClient.post(
		'/v1/payment-methods',
		body,
		createPaymentMethodResponseSchema,
	);
	return response.id;
};
