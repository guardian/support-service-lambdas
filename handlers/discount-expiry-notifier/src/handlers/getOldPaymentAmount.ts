import { stageFromEnvironment } from '@modules/stage';
import { getBillingPreview } from '@modules/zuora/billingPreview';
import { doQuery } from '@modules/zuora/query';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';
import { z } from 'zod';
import type { BillingPreviewInvoiceItem } from '../../../../modules/zuora/src/types/objects/billingPreview';
import { calculateTotalAmount, filterRecords } from '../helpers';
import {
	BaseRecordForEmailSendSchema,
	createQueryResponseSchema,
} from '../types';

export type GetOldPaymentAmountInput = z.infer<
	typeof BaseRecordForEmailSendSchema
>;

export const handler = async (event: GetOldPaymentAmountInput) => {
	try {
		const parsedEvent = BaseRecordForEmailSendSchema.parse(event);
		const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
		const lastPaymentDateBeforeDiscountExpiry =
			getLastPaymentDateBeforeDiscountExpiry(
				parsedEvent.firstPaymentDateAfterDiscountExpiry,
				parsedEvent.paymentFrequency,
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

	return {
		...parsedEvent,
		lastPaymentDateBeforeDiscountExpiry,
		oldPaymentAmount,
	};
};

//when target date is today, whether we use the query or billing preview depends on whether a bill run
//has been run today. We try the billing-preview first for the target date, then use a query if nothing is return from the billing-preview
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

		if (pastInvoiceItems.length > 0) {
			return {
				...parsedEvent,
				lastPaymentDateBeforeDiscountExpiry,
				oldPaymentAmount: calculateTotalAmount(
					transformZuoraResponseKeys(pastInvoiceItems),
				),
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
	const invoiceItemsForSubscription: BillingPreviewInvoiceItem[] =
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
	const pastInvoiceItems: QueryInvoiceItem[] = await getPastInvoiceItems(
		zuoraClient,
		subName,
		targetDate,
	);

	return calculateTotalAmount(transformZuoraResponseKeys(pastInvoiceItems));
};

export const getFutureInvoiceItems = async (
	zuoraClient: ZuoraClient,
	subName: string,
	billingAccountId: string,
	targetDate: string,
): Promise<BillingPreviewInvoiceItem[]> => {
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
): Promise<QueryInvoiceItem[]> => {
	const getInvoiceItemsResponse = await doQuery<QueryResponse>(
		zuoraClient,
		query(subName, targetDate),
		queryResponseSchema,
	);

	return getInvoiceItemsResponse.records;
};

const query = (subName: string, serviceStartDate: string): string =>
	`SELECT chargeName, chargeAmount, taxAmount, serviceStartDate, subscriptionNumber FROM InvoiceItem WHERE subscriptionNumber = '${subName}' AND ServiceStartDate = '${serviceStartDate}' AND ChargeName!='Delivery-problem credit' AND ChargeName!='Holiday Credit'`;

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

export const transformZuoraResponseKeys = (
	records: QueryInvoiceItem[],
): BillingPreviewInvoiceItem[] => {
	return records.map((record) => ({
		chargeAmount: record.ChargeAmount,
		taxAmount: record.TaxAmount,
		serviceStartDate: new Date(record.ServiceStartDate),
		subscriptionNumber: record.SubscriptionNumber,
		chargeName: record.ChargeName,
	}));
};

export const queryInvoiceItemSchema = z
	.object({
		Id: z.optional(z.string()),
		SubscriptionNumber: z.string(),
		ServiceStartDate: z.coerce.date(),
		ChargeName: z.string(),
		ChargeAmount: z.number(),
		TaxAmount: z.number(),
	})
	.strict();
export type QueryInvoiceItem = z.infer<typeof queryInvoiceItemSchema>;

export const queryResponseSchema = createQueryResponseSchema(
	queryInvoiceItemSchema,
);
export type QueryResponse = z.infer<typeof queryResponseSchema>;
