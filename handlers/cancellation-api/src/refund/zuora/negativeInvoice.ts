import type { Dayjs } from 'dayjs';
import { z } from 'zod';
import { logger } from '@modules/logger/logger';
import type { SubscriptionNumber } from '@modules/zuora/identifiers';
import { getSubscription } from '@modules/zuora/subscription';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { getLatestNegativeInvoiceId } from '../latestInvoice';
import {
	generateInvoice,
	getInvoiceStatus,
	postInvoice,
} from './invoiceGeneration';
import { getSubscriptionInvoiceItems } from './subscriptionInvoiceItems';

/**
 * Cancellations don't run billing, so this generates and posts the negative invoice for a cancellation effective on
 * or before targetDate. A re-run has nothing left to bill, so in both cases the negative invoice is the subscription's
 * latest one.
 */
export async function generateAndPostNegativeInvoice(
	zuoraClient: ZuoraClient,
	{
		subscriptionNumber,
		targetDate,
		today,
	}: {
		subscriptionNumber: SubscriptionNumber;
		targetDate: Dayjs;
		today: Dayjs;
	},
): Promise<string> {
	const { accountId } = await getSubscription(
		zuoraClient,
		subscriptionNumber,
		z.object({ accountId: z.string() }),
	);
	const generatedInvoiceId = await generateInvoice(zuoraClient, {
		accountId,
		// in case the accounting period for the target date has closed
		invoiceDate: today,
		targetDate,
	});
	const negativeInvoiceId = getLatestNegativeInvoiceId(
		await getSubscriptionInvoiceItems(zuoraClient, subscriptionNumber),
	);
	logger.log(
		generatedInvoiceId === undefined
			? `Nothing to bill, using the latest negative invoice ${negativeInvoiceId}`
			: `Generated negative invoice ${generatedInvoiceId}`,
	);
	if (
		generatedInvoiceId !== undefined &&
		generatedInvoiceId !== negativeInvoiceId
	) {
		throw new Error(
			`Generated invoice ${generatedInvoiceId} is not the latest negative invoice ${negativeInvoiceId}`,
		);
	}
	if ((await getInvoiceStatus(zuoraClient, negativeInvoiceId)) === 'Draft') {
		await postInvoice(zuoraClient, negativeInvoiceId);
	}
	return negativeInvoiceId;
}
