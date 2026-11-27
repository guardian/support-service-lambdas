import { getInvoiceItems } from '@modules/zuora/invoice';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { checkInvoiceOnlyForSubscription } from '../singleSubscriptionInvoice';
import type { SubscriptionInvoiceItem } from '../subscriptionInvoiceItem';

export async function checkInvoicesOnlyForSubscription(
	zuoraClient: ZuoraClient,
	invoiceIds: string[],
	subscriptionInvoiceItems: SubscriptionInvoiceItem[],
): Promise<void> {
	for (const invoiceId of invoiceIds) {
		const { invoiceItems } = await getInvoiceItems(zuoraClient, invoiceId);
		checkInvoiceOnlyForSubscription({
			invoiceId,
			invoiceItemIds: invoiceItems.map(({ id }) => id),
			subscriptionInvoiceItems,
		});
	}
}
