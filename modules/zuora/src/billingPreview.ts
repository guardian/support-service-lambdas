import { groupBy, sortBy, sumNumbers } from '@modules/arrayFunctions';
import { getIfDefined } from '@modules/nullAndUndefined';
import dayjs, { Dayjs } from 'dayjs';
import { zuoraDateFormat } from './common';
import type { ZuoraClient } from './zuoraClient';
import type { BillingPreview } from './zuoraSchemas';
import { billingPreviewSchema } from './zuoraSchemas';

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

export type SimpleInvoiceItem = { date: Date; amount: number };

export function getNextInvoiceTotal(invoiceItems: Array<SimpleInvoiceItem>) {
	return convertItemsToTotal(getNextInvoiceItems(invoiceItems)).total;
}

export function getNextInvoiceItems(invoiceItems: Array<SimpleInvoiceItem>) {
	const ordered = getOrderedInvoiceItemGroups(invoiceItems);

	return getIfDefined(
		ordered[0],
		'could not find a payment in the invoice preview',
	);
}

export function getNextNonFreePaymentDate(
	invoiceItems: Array<SimpleInvoiceItem>,
) {
	const ordered = getOrderedInvoiceItemGroups(invoiceItems);

	const firstNonFree = getIfDefined(
		ordered.find((items) => convertItemsToTotal(items).total > 0),
		'could not find a non free payment in the invoice preview',
	);

	return firstNonFree.date;
}

function getOrderedInvoiceItemGroups(invoiceItems: Array<SimpleInvoiceItem>) {
	if (invoiceItems[0] === undefined) {
		throw new Error('no invoice items in preview');
	}
	const grouped = groupBy(invoiceItems, (invoiceItem) =>
		zuoraDateFormat(dayjs(invoiceItem.date)),
	);

	const sortedItemGroups: [string, SimpleInvoiceItem[]][] = sortBy(
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

export const billingPreviewToSimpleInvoiceItems = (
	billingPreviewAfter: BillingPreview,
): SimpleInvoiceItem[] =>
	billingPreviewAfter.invoiceItems.map((entry) => ({
		date: entry.serviceStartDate,
		amount: entry.chargeAmount + entry.taxAmount,
	}));
