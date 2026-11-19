import { z } from 'zod';
import { logger } from '@modules/logger/logger';
import { stageFromEnvironment } from '@modules/stage';
import { subscriptionNumberSchema } from '@modules/zuora/identifiers';
import { getInvoice } from '@modules/zuora/invoice';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { getLatestPositiveInvoiceId } from '../latestInvoice';
import type { PaymentSettlementStatus } from '../paymentSettlement';
import { getPaymentSettlementStatus } from '../paymentSettlement';
import { getLatestInvoicePayment } from '../zuora/invoicePayment';
import { getSubscriptionInvoiceItems } from '../zuora/subscriptionInvoiceItems';

const checkPaymentSettlementInputSchema = z.object({
	subscriptionNumber: subscriptionNumberSchema,
	// set when a refund is due, otherwise the latest positive invoice is checked
	paidInvoiceId: z.string().min(1).optional(),
});

type CheckPaymentSettlementInput = z.infer<
	typeof checkPaymentSettlementInputSchema
>;

export type CheckPaymentSettlementOutput = {
	invoiceId: string;
	status: PaymentSettlementStatus;
	paymentId?: string;
};

export const handler = async (
	event: unknown,
): Promise<CheckPaymentSettlementOutput> => {
	const input = checkPaymentSettlementInputSchema.parse(event);
	logger.resetContext();
	logger.mutableAddContext(input.subscriptionNumber);
	const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
	return checkPaymentSettlement(zuoraClient, input);
};

export async function checkPaymentSettlement(
	zuoraClient: ZuoraClient,
	{ subscriptionNumber, paidInvoiceId }: CheckPaymentSettlementInput,
): Promise<CheckPaymentSettlementOutput> {
	const invoiceId =
		paidInvoiceId ??
		getLatestPositiveInvoiceId(
			await getSubscriptionInvoiceItems(zuoraClient, subscriptionNumber),
		);
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
	return { invoiceId, status, paymentId: latestPayment?.id };
}
