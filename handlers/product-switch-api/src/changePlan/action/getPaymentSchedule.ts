import type { SimpleInvoiceTotal } from '@modules/zuora/billingPreview';
import {
	getBillingPreview,
	getOrderedInvoiceTotals,
	itemsForSubscription,
	toSimpleInvoiceItems,
} from '@modules/zuora/billingPreview';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type dayjs from 'dayjs';

/**
 * returns the payment schedule for a given subscription in a simple format suitable for summary display e.g. on screen or in confirmation emails
 */
export class GetPaymentSchedule {
	constructor(private zuoraClient: ZuoraClient) {}

	execute = async (
		targetDate: dayjs.Dayjs,
		subscriptionNumber: string,
		accountNumber: string,
	): Promise<SimpleInvoiceTotal[]> => {
		const billingPreview = await getBillingPreview(
			this.zuoraClient,
			targetDate,
			accountNumber,
		);
		return getOrderedInvoiceTotals(
			toSimpleInvoiceItems(
				itemsForSubscription(subscriptionNumber)(billingPreview),
			),
		);
	};
}
