import { stageFromEnvironment } from '@modules/stage';
import { getBillingPreview } from '@modules/zuora/billingPreview';
import { doQuery } from '@modules/zuora/query';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { InvoiceItem } from '@modules/zuora/zuoraSchemas';
import dayjs from 'dayjs';
import type { z } from 'zod';
import { BaseRecordForEmailSendSchema } from '../types';

export type GetOldPaymentAmountInput = z.infer<
	typeof BaseRecordForEmailSendSchema
>;

export const handler = async (event: GetOldPaymentAmountInput) => {
	try {
		const parsedEvent = BaseRecordForEmailSendSchema.parse(event);
		const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
		console.log('zuoraClient:', zuoraClient);
		const lastPaymentDateBeforeDiscountExpiry =
			getLastPaymentDateBeforeDiscountExpiry(
				parsedEvent.firstPaymentDateAfterDiscountExpiry,
				parsedEvent.paymentFrequency,
			);
		console.log(
			'lastPaymentDateBeforeDiscountExpiry:',
			lastPaymentDateBeforeDiscountExpiry,
		);

		const today = dayjs();
		const targetDate = dayjs(lastPaymentDateBeforeDiscountExpiry);

		if (targetDate.isBefore(today)) {
			return await handleTargetDateBeforeToday(
				zuoraClient,
				parsedEvent,
				lastPaymentDateBeforeDiscountExpiry,
			);
		}

		if (targetDate.isAfter(today)) {
			return await handleTargetDateAfterToday(
				zuoraClient,
				parsedEvent,
				lastPaymentDateBeforeDiscountExpiry,
			);
		}

		return await handleTargetDateIsToday(
			zuoraClient,
			parsedEvent,
			lastPaymentDateBeforeDiscountExpiry,
		);
	} catch (error) {
		console.log('error:', error);
		const errorMessage =
			'Error getting old payment amount:' +
			(error instanceof Error ? error.message : JSON.stringify(error, null, 2));
		return {
			...event,
			errorDetail: errorMessage,
		};
	}
};

const handleTargetDateBeforeToday = async (
	zuoraClient: ZuoraClient,
	parsedEvent: GetOldPaymentAmountInput,
	lastPaymentDateBeforeDiscountExpiry: string,
) => {
	const oldPaymentAmount = await getOldPaymentAmountWhenTargetDateIsBeforeToday(
		zuoraClient,
		parsedEvent.zuoraSubName,
		lastPaymentDateBeforeDiscountExpiry,
	);
	console.log(
		'oldPaymentAmount (target date is before today):',
		oldPaymentAmount,
	);

	return {
		...parsedEvent,
		lastPaymentDateBeforeDiscountExpiry,
		oldPaymentAmount,
	};
};

const handleTargetDateAfterToday = async (
	zuoraClient: ZuoraClient,
	parsedEvent: GetOldPaymentAmountInput,
	lastPaymentDateBeforeDiscountExpiry: string,
) => {
	const oldPaymentAmount = await getOldPaymentAmountWhenTargetDateIsAfterToday(
		zuoraClient,
		parsedEvent.zuoraSubName,
		parsedEvent.billingAccountId,
		lastPaymentDateBeforeDiscountExpiry,
	);
	console.log(
		'oldPaymentAmount (target date is after today):',
		oldPaymentAmount,
	);

	return {
		...parsedEvent,
		lastPaymentDateBeforeDiscountExpiry,
		oldPaymentAmount,
	};
};

//when target date is today, whether we use the query or billing preview depends on whether a bill run
//has been run today. If a bill run has been run today, we use the query, otherwise we use the billing preview
export const handleTargetDateIsToday = async (
	zuoraClient: ZuoraClient,
	parsedEvent: GetOldPaymentAmountInput,
	lastPaymentDateBeforeDiscountExpiry: string,
) => {
	const futureInvoiceItems = await getFutureInvoiceItems(
		zuoraClient,
		parsedEvent.zuoraSubName,
		parsedEvent.billingAccountId,
		lastPaymentDateBeforeDiscountExpiry,
	);
	console.log(
		'handleTargetDateIsToday futureInvoiceItems:',
		futureInvoiceItems,
	);
	if (futureInvoiceItems.length > 0) {
		return {
			...parsedEvent,
			lastPaymentDateBeforeDiscountExpiry,
			oldPaymentAmount: calculateTotalAmount(futureInvoiceItems),
		};
	} else {
		const pastInvoiceItems = await getPastInvoiceItems(
			zuoraClient,
			parsedEvent.zuoraSubName,
			lastPaymentDateBeforeDiscountExpiry,
		);
		console.log('handleTargetDateIsToday pastInvoiceItems:', pastInvoiceItems);
		if (pastInvoiceItems.length > 0) {
			return {
				...parsedEvent,
				lastPaymentDateBeforeDiscountExpiry,
				oldPaymentAmount: calculateTotalAmount(pastInvoiceItems),
			};
		}
	}
	return {
		...parsedEvent,
		errorDetail: 'Error getting old payment amount',
	};
};

const getOldPaymentAmountWhenTargetDateIsAfterToday = async (
	zuoraClient: ZuoraClient,
	subName: string,
	billingAccountId: string,
	targetDate: string,
): Promise<number> => {
	const invoiceItemsForSubscription: InvoiceItem[] =
		await getFutureInvoiceItems(
			zuoraClient,
			subName,
			billingAccountId,
			targetDate,
		);

	return calculateTotalAmount(invoiceItemsForSubscription);
};

const getOldPaymentAmountWhenTargetDateIsBeforeToday = async (
	zuoraClient: ZuoraClient,
	subName: string,
	targetDate: string,
): Promise<number> => {
	const pastInvoiceItems = await getPastInvoiceItems(
		zuoraClient,
		subName,
		targetDate,
	);
	console.log('pastInvoiceItems:', pastInvoiceItems);

	return calculateTotalAmount(pastInvoiceItems);
};

export const getFutureInvoiceItems = async (
	zuoraClient: ZuoraClient,
	subName: string,
	billingAccountId: string,
	targetDate: string,
): Promise<InvoiceItem[]> => {
	const getBillingPreviewResponse = await getBillingPreview(
		zuoraClient,
		dayjs(targetDate),
		billingAccountId,
	);
	const invoiceItemsForSubscription = filterRecords(
		getBillingPreviewResponse.invoiceItems,
		subName,
		targetDate,
	);
	return invoiceItemsForSubscription;
};

export const getPastInvoiceItems = async (
	zuoraClient: ZuoraClient,
	subName: string,
	targetDate: string,
) => {
	const getInvoiceItemsResponse = await doQuery(
		zuoraClient,
		query(subName, targetDate),
	);
	return getInvoiceItemsResponse.records;
};

export const calculateTotalAmount = (records: InvoiceItem[]) => {
	return records.reduce(
		(total, record) => total + record.chargeAmount + record.taxAmount,
		0,
	);
};

const query = (subName: string, serviceStartDate: string): string =>
	`SELECT chargeAmount, taxAmount, serviceStartDate, subscriptionNumber FROM InvoiceItem WHERE SubscriptionNumber = '${subName}' AND ServiceStartDate = '${serviceStartDate}' AND ChargeName!='Delivery-problem credit' AND ChargeName!='Holiday Credit'`;

export function getLastPaymentDateBeforeDiscountExpiry(
	firstPaymentDateAfterDiscountExpiry: string,
	paymentFrequency: string,
): string {
	const date = new Date(firstPaymentDateAfterDiscountExpiry);

	//if the date is a leap year, set the last day of February
	if (date.getMonth() === 1 && date.getDate() === 29) {
		date.setDate(28);
	}

	switch (paymentFrequency.toLowerCase()) {
		case 'annual':
			date.setFullYear(date.getFullYear() - 1);
			break;
		case 'quarter':
			date.setMonth(date.getMonth() - 3);
			break;
		case 'month':
			date.setMonth(date.getMonth() - 1);
			break;
		default:
			throw new Error('Invalid payment frequency');
	}

	return date.toISOString().split('T')[0] ?? '';
}

//this function is duplicated in getNewPaymentAmount.ts
const filterRecords = (
	invoiceItems: InvoiceItem[],
	subscriptionName: string,
	firstPaymentDateAfterDiscountExpiry: string,
): InvoiceItem[] => {
	return invoiceItems.filter(
		(item) =>
			item.subscriptionName === subscriptionName &&
			dayjs(item.serviceStartDate).isSame(
				dayjs(firstPaymentDateAfterDiscountExpiry),
				'day',
			),
	);
};
