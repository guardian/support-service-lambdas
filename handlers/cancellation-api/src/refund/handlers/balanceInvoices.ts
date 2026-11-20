import dayjs from 'dayjs';
import { z } from 'zod';
import { logger } from '@modules/logger/logger';
import { stageFromEnvironment } from '@modules/stage';
import {
	orderNumberSchema,
	subscriptionNumberSchema,
} from '@modules/zuora/identifiers';
import { getInvoice } from '@modules/zuora/invoice';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { toPence } from '../money';
import { getRefundKey } from '../refundKey';
import { checkInvoiceOnlyForSubscription } from '../singleSubscriptionInvoice';
import { getSubscriptionInvoiceItems } from '../zuora/subscriptionInvoiceItems';
import { zeroInvoice } from '../zuora/zeroInvoice';
import { parseStepInput } from './stepInput';

const balanceInvoicesInputSchema = z.object({
	subscriptionNumber: subscriptionNumberSchema,
	cancellationOrderNumber: orderNumberSchema,
	// the refunded invoice, or the unpaid invoice after backdating
	paidInvoiceId: z.string().min(1),
	// the cancellation invoice, or the credit invoice after backdating
	negativeInvoiceId: z.string().min(1),
});

type BalanceInvoicesInput = z.infer<typeof balanceInvoicesInputSchema>;

/**
 * Brings the paid and negative invoice balances to zero. A retry skips an invoice that is already zero.
 */
export const handler = async (
	event: unknown,
): Promise<Record<string, never>> => {
	const input = parseStepInput(balanceInvoicesInputSchema, event);
	logger.resetContext();
	logger.mutableAddContext(input.subscriptionNumber);
	const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
	await balanceInvoices(zuoraClient, input, dayjs());
	return {};
};

export async function balanceInvoices(
	zuoraClient: ZuoraClient,
	input: BalanceInvoicesInput,
	today: dayjs.Dayjs,
): Promise<void> {
	const invoiceIds = [input.paidInvoiceId, input.negativeInvoiceId];
	const subscriptionInvoiceItems = await getSubscriptionInvoiceItems(
		zuoraClient,
		input.subscriptionNumber,
	);
	// checks both before adjusting either, so neither is left half balanced
	for (const invoiceId of invoiceIds) {
		const { amount } = await getInvoice(zuoraClient, invoiceId);
		checkInvoiceOnlyForSubscription({
			invoiceId,
			invoiceAmountPence: toPence(amount),
			subscriptionInvoiceItems,
		});
	}
	for (const invoiceId of invoiceIds) {
		await zeroInvoice({
			zuoraClient,
			invoiceId,
			adjustmentDate: today,
			comment: getRefundKey(input),
		});
	}
}
