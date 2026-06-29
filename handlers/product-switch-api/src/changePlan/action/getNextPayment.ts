import {
	getBillingPreview,
	getOrderedInvoiceTotals,
	itemsForSubscription,
	toSimpleInvoiceItems,
} from '@modules/zuora/billingPreview';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type dayjs from 'dayjs';

export class GetNextPayment {
	constructor(private zuoraClient: ZuoraClient) {}

	execute = async (
		targetDate: dayjs.Dayjs,
		subscriptionNumber: string,
	): Promise<{ date: Date; total: number } | undefined> => {
		const billingPreview = await getBillingPreview(
			this.zuoraClient,
			targetDate,
			subscriptionNumber,
		);
		return getOrderedInvoiceTotals(
			toSimpleInvoiceItems(
				itemsForSubscription(subscriptionNumber)(billingPreview),
			),
		)[0];
	};
}
