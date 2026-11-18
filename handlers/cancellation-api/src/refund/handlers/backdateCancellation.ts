import dayjs from 'dayjs';
import { z } from 'zod';
import { logger } from '@modules/logger/logger';
import { stageFromEnvironment } from '@modules/stage';
import { subscriptionNumberSchema } from '@modules/zuora/identifiers';
import { buildCancellationOrderRequest } from '@modules/zuora/orders/cancelSubscription';
import { executeOrderRequest } from '@modules/zuora/orders/orderRequests';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { planBackdate } from '../backdate';
import { getLatestNegativeInvoiceId } from '../latestInvoice';
import { deleteOrder, orderExists } from '../zuora/cancellationOrder';
import { getInvoiceServiceStartDate } from '../zuora/invoiceServiceStartDate';
import { getSubscriptionCancellation } from '../zuora/subscriptionCancellation';
import { getSubscriptionInvoiceItems } from '../zuora/subscriptionInvoiceItems';

const completedOrderResponseSchema = z.object({
	status: z.literal('Completed'),
});

const backdateCancellationInputSchema = z.object({
	subscriptionNumber: subscriptionNumberSchema,
	accountNumber: z.string().min(1),
	cancellationOrderNumber: z.string().min(1),
	unpaidInvoiceId: z.string().min(1),
	cancellationReasons: z.object({
		UserCancellationReason__c: z.string().optional(),
		CancellationReason__c: z.string().optional(),
	}),
});

type BackdateCancellationInput = z.infer<
	typeof backdateCancellationInputSchema
>;

export type BackdateCancellationOutput = {
	backdated: boolean;
	// credits the unpaid invoice
	creditInvoiceId: string;
};

export const handler = async (
	event: unknown,
): Promise<BackdateCancellationOutput> => {
	const input = backdateCancellationInputSchema.parse(event);
	logger.resetContext();
	logger.mutableAddContext(input.subscriptionNumber);
	const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
	return backdateCancellation(zuoraClient, input);
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
				orderDate: dayjs(),
				cancellationEffectiveDate: unpaidPeriodStart,
				cancellationReasons,
			}),
			completedOrderResponseSchema,
		);
	}

	const creditInvoiceId = getLatestNegativeInvoiceId(
		await getSubscriptionInvoiceItems(zuoraClient, subscriptionNumber),
	);
	return { backdated: plan.backdated, creditInvoiceId };
}
