import type { Dayjs } from 'dayjs';
import { z } from 'zod';
import { zuoraDateFormat } from '@modules/zuora/utils';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';

const nothingToBillMessage =
	'The invoice will not be generated because there are no charges due on this account.';

const generateResponseSchema = z.tuple([
	z.union([
		z.object({ Success: z.literal(true), Id: z.string() }),
		z.object({
			Success: z.literal(false),
			Errors: z.array(z.object({ Code: z.string(), Message: z.string() })),
		}),
	]),
]);

/**
 * Bills the account up to targetDate, returning the generated (draft) invoice's ID, or undefined if there was nothing
 * to bill, e.g. because a previous call already billed it.
 * This older API is used because the newer billing documents API rejects cancelled subscriptions.
 * https://developer.zuora.com/v1-api-reference/older-api/operation/Action_POSTgenerate/
 */
export async function generateInvoice(
	zuoraClient: ZuoraClient,
	{
		accountId,
		invoiceDate,
		targetDate,
	}: { accountId: string; invoiceDate: Dayjs; targetDate: Dayjs },
): Promise<string | undefined> {
	const [result] = await zuoraClient.post(
		'/v1/action/generate',
		JSON.stringify({
			type: 'Invoice',
			objects: [
				{
					AccountId: accountId,
					InvoiceDate: zuoraDateFormat(invoiceDate),
					TargetDate: zuoraDateFormat(targetDate),
				},
			],
		}),
		generateResponseSchema,
	);
	if (result.Success) {
		return result.Id;
	}
	if (result.Errors.every(({ Message }) => Message === nothingToBillMessage)) {
		return undefined;
	}
	throw new Error(
		`Failed to generate invoice: ${JSON.stringify(result.Errors)}`,
	);
}

const invoiceStatusSchema = z.object({ status: z.string() });

export async function getInvoiceStatus(
	zuoraClient: ZuoraClient,
	invoiceId: string,
): Promise<string> {
	const { status } = await zuoraClient.get(
		`/v1/invoices/${invoiceId}`,
		invoiceStatusSchema,
	);
	return status;
}

const bulkPostResponseSchema = z.object({
	invoices: z.tuple([z.object({ success: z.literal(true) })]),
});

// https://developer.zuora.com/v1-api-reference/api/operation/POST_PostInvoices/
export async function postInvoice(
	zuoraClient: ZuoraClient,
	invoiceId: string,
): Promise<void> {
	await zuoraClient.post(
		'/v1/invoices/bulk-post',
		JSON.stringify({ invoices: [{ id: invoiceId }] }),
		bulkPostResponseSchema,
	);
}
