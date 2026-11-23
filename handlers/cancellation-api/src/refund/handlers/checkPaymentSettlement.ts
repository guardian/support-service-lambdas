import { z } from 'zod';
import { logger } from '@modules/logger/logger';
import { stageFromEnvironment } from '@modules/stage';
import { subscriptionNumberSchema } from '@modules/zuora/identifiers';
import { disableInvoiceAutoPay, getInvoice } from '@modules/zuora/invoice';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { getLatestPositiveInvoiceId } from '../latestInvoice';
import type { PaymentSettlementStatus } from '../paymentSettlement';
import { getPaymentSettlementStatus } from '../paymentSettlement';
import { getLatestInvoicePayment } from '../zuora/invoicePayment';
import { checkInvoicesOnlyForSubscription } from '../zuora/singleSubscriptionInvoices';
import { getSubscriptionInvoiceItems } from '../zuora/subscriptionInvoiceItems';
import { parseStepInput } from './stepInput';

const checkPaymentSettlementInputSchema = z.object({
	subscriptionNumber: subscriptionNumberSchema,
	// set when a refund is due, otherwise the latest positive invoice is checked
	paidInvoiceId: z.string().min(1).optional(),
	// the cancellation invoice, set when a refund is due
	negativeInvoiceId: z.string().min(1).optional(),
});

type CheckPaymentSettlementInput = z.infer<
	typeof checkPaymentSettlementInputSchema
>;

export type CheckPaymentSettlementOutput = {
	invoiceId: string;
	status: PaymentSettlementStatus;
	paymentId?: string;
	paymentAmount?: number;
};

export const handler = async (
	event: unknown,
): Promise<CheckPaymentSettlementOutput> => {
	const input = parseStepInput(checkPaymentSettlementInputSchema, event);
	logger.resetContext();
	logger.mutableAddContext(input.subscriptionNumber);
	const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
	return checkPaymentSettlement(zuoraClient, input);
};

export async function checkPaymentSettlement(
	zuoraClient: ZuoraClient,
	{
		subscriptionNumber,
		paidInvoiceId,
		negativeInvoiceId,
	}: CheckPaymentSettlementInput,
): Promise<CheckPaymentSettlementOutput> {
	const subscriptionInvoiceItems = await getSubscriptionInvoiceItems(
		zuoraClient,
		subscriptionNumber,
	);
	const invoiceId =
		paidInvoiceId ?? getLatestPositiveInvoiceId(subscriptionInvoiceItems);
	// Check that all invoice items in this invoice are for the cancelled subscription,
	// otherwise throw and leave for manual handling
	await checkInvoicesOnlyForSubscription(
		zuoraClient,
		negativeInvoiceId === undefined
			? [invoiceId]
			: [invoiceId, negativeInvoiceId],
		subscriptionInvoiceItems,
	);
	// Disable AutoPay before fetching the payment. Otherwise, after a payment fails, the next payment run would take a
	// new payment for the still-unpaid invoice: possibly between our daily checks, or while we backdate the
	// cancellation and zero the invoice, so the customer pays for a period they no longer have. Without AutoPay, an
	// unpaid invoice stays unpaid and is backdated.
	await disableInvoiceAutoPay(zuoraClient, invoiceId);
	const { amount, balance } = await getInvoice(zuoraClient, invoiceId);
	const latestPayment = await getLatestInvoicePayment(zuoraClient, invoiceId);
	const status = getPaymentSettlementStatus({
		invoiceAmount: amount,
		invoiceBalance: balance,
		latestPayment,
	});
	logger.log(`Payment settlement for invoice ${invoiceId} is ${status}`, {
		amount,
		balance,
		latestPayment,
	});
	return {
		invoiceId,
		status,
		paymentId: latestPayment?.id,
		paymentAmount: latestPayment?.amount,
	};
}
