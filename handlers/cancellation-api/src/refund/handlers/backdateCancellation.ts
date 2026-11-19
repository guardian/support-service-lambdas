import dayjs from 'dayjs';
import { z } from 'zod';
import { logger } from '@modules/logger/logger';
import { stageFromEnvironment } from '@modules/stage';
import { subscriptionNumberSchema } from '@modules/zuora/identifiers';
import { buildCancellationOrderRequest } from '@modules/zuora/orders/cancelSubscription';
import { executeOrderRequest } from '@modules/zuora/orders/orderRequests';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { planBackdate } from '../backdate';
import { deleteOrder, orderExists } from '../zuora/cancellationOrder';
import { getInvoiceServiceStartDate } from '../zuora/invoiceServiceStartDate';
import { generateAndPostNegativeInvoice } from '../zuora/negativeInvoice';
import { getSubscriptionCancellation } from '../zuora/subscriptionCancellation';

const completedOrderResponseSchema = z.object({
	status: z.literal('Completed'),
});

const backdateCancellationInputSchema = z.object({
	subscriptionNumber: subscriptionNumberSchema,
	accountNumber: z.string().min(1),
	cancellationOrderNumber: z.string().min(1),
	// the invoice whose payment failed
	invoiceId: z.string().min(1),
	cancellationReasons: z.object({
		UserCancellationReason__c: z.string().optional(),
		CancellationReason__c: z.string().optional(),
	}),
});

type BackdateCancellationInput = Omit<
	z.infer<typeof backdateCancellationInputSchema>,
	'invoiceId'
> & { unpaidInvoiceId: string };

export type BackdateCancellationOutput = {
	backdated: boolean;
	// credits the unpaid invoice
	creditInvoiceId: string;
};

/**
 * Returns the credit invoice as negativeInvoiceId, as it takes the cancellation invoice's place in the rest of the
 * workflow.
 */
export const handler = async (
	event: unknown,
): Promise<{ backdated: boolean; negativeInvoiceId: string }> => {
	const { invoiceId, ...input } = backdateCancellationInputSchema.parse(event);
	logger.resetContext();
	logger.mutableAddContext(input.subscriptionNumber);
	const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
	const { backdated, creditInvoiceId } = await backdateCancellation(
		zuoraClient,
		{ ...input, unpaidInvoiceId: invoiceId },
		dayjs(),
	);
	return { backdated, negativeInvoiceId: creditInvoiceId };
};

export async function backdateCancellation(
	zuoraClient: ZuoraClient,
	{
		subscriptionNumber,
		accountNumber,
		cancellationOrderNumber,
		unpaidInvoiceId,
		cancellationReasons,
	}: BackdateCancellationInput,
	today: dayjs.Dayjs,
): Promise<BackdateCancellationOutput> {
	const unpaidPeriodStart = await getInvoiceServiceStartDate(
		zuoraClient,
		subscriptionNumber,
		unpaidInvoiceId,
	);
	const cancellationOrderExists = await orderExists(
		zuoraClient,
		cancellationOrderNumber,
	);
	const { status, subscriptionEndDate } = await getSubscriptionCancellation(
		zuoraClient,
		subscriptionNumber,
	);
	const plan = planBackdate({
		cancellationOrderExists,
		subscriptionStatus: status,
		cancellationDate: subscriptionEndDate
			? dayjs(subscriptionEndDate)
			: undefined,
		unpaidPeriodStart,
	});
	logger.log('Backdate plan', {
		plan,
		cancellationOrderExists,
		status,
		subscriptionEndDate,
		unpaidPeriodStart: unpaidPeriodStart.format('YYYY-MM-DD'),
	});

	if (plan.action === 'deleteAndRecancel') {
		await deleteOrder(zuoraClient, cancellationOrderNumber);
	}
	if (plan.action !== 'none') {
		await executeOrderRequest(
			zuoraClient,
			buildCancellationOrderRequest({
				accountNumber,
				subscriptionNumber,
				orderDate: today,
				cancellationEffectiveDate: unpaidPeriodStart,
				cancellationReasons,
				runBilling: false,
			}),
			completedOrderResponseSchema,
		);
	}

	// also covers a cancellation that already covered the unpaid period, which wasn't billed
	const creditInvoiceId = await generateAndPostNegativeInvoice(zuoraClient, {
		subscriptionNumber,
		targetDate: unpaidPeriodStart,
		today,
	});
	return { backdated: plan.backdated, creditInvoiceId };
}
