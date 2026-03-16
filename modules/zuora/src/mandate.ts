import { z } from 'zod';
import type { GoCardlessClient } from './goCardlessClient';

const getMandateResponseSchema = z.object({
	mandates: z.object({
		id: z.string(),
		reference: z.string(),
		scheme: z.string(),
		links: z.object({
			customer_bank_account: z.string(),
		}),
	}),
});

const createMandateResponseSchema = z.object({
	mandates: z.object({
		id: z.string(),
		reference: z.string(),
	}),
});

const getCustomerBankAccountResponseSchema = z.object({
	customer_bank_accounts: z.object({
		id: z.string(),
		account_holder_name: z.string(),
		account_number_ending: z.string(),
		bank_name: z.string().optional(),
		branch_code: z.string().optional(),
		country_code: z.string(),
		currency: z.string(),
		iban: z.string().optional(),
		links: z
			.object({
				customer: z.string().optional(),
			})
			.optional(),
	}),
});

export type GoCardlessMandate = z.infer<
	typeof getMandateResponseSchema
>['mandates'];

export type GoCardlessCustomerBankAccount = z.infer<
	typeof getCustomerBankAccountResponseSchema
>['customer_bank_accounts'];

export const getMandate = async (
	goCardlessClient: GoCardlessClient,
	mandateId: string,
): Promise<GoCardlessMandate> => {
	const response: z.infer<typeof getMandateResponseSchema> =
		await goCardlessClient.get(
			`/mandates/${mandateId}`,
			getMandateResponseSchema,
		);
	return response.mandates;
};

export const getCustomerBankAccount = async (
	goCardlessClient: GoCardlessClient,
	customerBankAccountId: string,
): Promise<GoCardlessCustomerBankAccount> => {
	const response: z.infer<typeof getCustomerBankAccountResponseSchema> =
		await goCardlessClient.get(
			`/customer_bank_accounts/${customerBankAccountId}`,
			getCustomerBankAccountResponseSchema,
		);
	return response.customer_bank_accounts;
};

export const createMandate = async (
	goCardlessClient: GoCardlessClient,
	customerBankAccountId: string,
	scheme: string,
): Promise<{ id: string; reference: string }> => {
	const body = JSON.stringify({
		mandates: {
			scheme,
			links: {
				customer_bank_account: customerBankAccountId,
			},
		},
	});
	const response: z.infer<typeof createMandateResponseSchema> =
		await goCardlessClient.post('/mandates', body, createMandateResponseSchema);
	return response.mandates;
};
