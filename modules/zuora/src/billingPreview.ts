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

export function getNextInvoiceTotal(
	invoiceItems: Array<{ date: Date; amount: number }>,
) {
	const ordered = getOrderedInvoiceData(invoiceItems);

	return getIfDefined(
		ordered[0],
		'could not find a payment in the invoice preview',
	);
}

export function getNextNonFreePaymentDate(
	invoiceItems: Array<{ date: Date; amount: number }>,
) {
	const ordered = getOrderedInvoiceData(invoiceItems);

	const firstNonFree = getIfDefined(
		ordered.find((item) => item.total > 0),
		'could not find a non free payment in the invoice preview',
	);

	const nextPaymentDate = zuoraDateFormat(dayjs(firstNonFree.date));

	return nextPaymentDate;
}

function getOrderedInvoiceData(
	invoiceItems: Array<{ date: Date; amount: number }>,
) {
	const grouped = groupBy(invoiceItems, (invoiceItem) => {
		return zuoraDateFormat(dayjs(invoiceItem.date));
	});

	const ordered = sortBy(Object.entries(grouped), (item) => item[0]).map(
		(item) => {
			return {
				date: new Date(item[0]),
				total: sumNumbers(item[1].map((item) => item.amount)),
			};
		},
	);
	return ordered;
}

export function billingPreviewToRecords(billingPreviewAfter: BillingPreview) {
	return billingPreviewAfter.invoiceItems.map((entry) => ({
		date: entry.serviceStartDate,
		amount: entry.chargeAmount + entry.taxAmount,
	}));
}
