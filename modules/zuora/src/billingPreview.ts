import { groupBy, sortBy, sumNumbers } from '@modules/arrayFunctions';
import { getIfDefined } from '@modules/nullAndUndefined';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import type { BillingPreview } from './types';
import { billingPreviewSchema } from './types';
import { zuoraDateFormat } from './utils';
import type { ZuoraClient } from './zuoraClient';

export const getBillingPreview = async (
	zuoraClient: ZuoraClient,
	targetDate: Dayjs,
	accountNumber: string,
): Promise<BillingPreview> => {
	const path = `v1/operations/billing-preview`;

	const body = JSON.stringify({
		accountNumber,
		targetDate: zuoraDateFormat(targetDate),
		assumeRenewal: 'Autorenew',
	});
	return zuoraClient.post(path, body, billingPreviewSchema);
};

export const itemsForSubscription =
	(subscriptionNumber: string) => (billingPreview: BillingPreview) =>
		billingPreview.invoiceItems.filter(
			(item) => item.subscriptionNumber === subscriptionNumber,
		);

export type SimpleInvoiceItem = { date: Date; amount: number };

export function getNextInvoiceTotal(invoiceItems: SimpleInvoiceItem[]) {
	return convertItemsToTotal(getNextInvoice(invoiceItems)).total;
}

export function getNextInvoiceItems(invoiceItems: SimpleInvoiceItem[]) {
	return getNextInvoice(invoiceItems).items;
}

export function getNextInvoice(invoiceItems: SimpleInvoiceItem[]) {
	const ordered = getOrderedInvoiceItemGroups(invoiceItems);

	return getIfDefined(
		ordered[0],
		'could not find a payment in the invoice preview',
	);
}

export function getNextNonFreePaymentDate(invoiceItems: SimpleInvoiceItem[]) {
	const ordered = getOrderedInvoiceItemGroups(invoiceItems);

	const firstNonFree = getIfDefined(
		ordered.find((items) => convertItemsToTotal(items).total > 0),
		'could not find a non free payment in the invoice preview',
	);

	return firstNonFree.date;
}

export function getOrderedInvoiceTotals(invoiceItems: SimpleInvoiceItem[]) {
	return getOrderedInvoiceItemGroups(invoiceItems).map((invoiceGroup) =>
		convertItemsToTotal(invoiceGroup),
	);
}

function getOrderedInvoiceItemGroups(invoiceItems: SimpleInvoiceItem[]) {
	if (invoiceItems[0] === undefined) {
		throw new Error('no invoice items in preview');
	}
	const grouped = groupBy(invoiceItems, (invoiceItem) =>
		zuoraDateFormat(dayjs(invoiceItem.date)),
	);

	const sortedItemGroups: Array<[string, SimpleInvoiceItem[]]> = sortBy(
		Object.entries(grouped),
		([date]) => date,
	);

	return sortedItemGroups.map(([date, items]) => ({
		date: new Date(date),
		items,
	}));
}

const convertItemsToTotal = ({
	date,
	items,
}: {
	date: Date;
	items: SimpleInvoiceItem[];
}) => ({
	date: new Date(date),
	total: sumNumbers(items.map((item) => item.amount)),
});

export const toSimpleInvoiceItems = (
	billingPreviewAfter: BillingPreview['invoiceItems'],
): SimpleInvoiceItem[] =>
	billingPreviewAfter.map((entry) => ({
		date: entry.serviceStartDate,
		amount: entry.chargeAmount + entry.taxAmount,
	}));
