import type { Dayjs } from 'dayjs';
import { z } from 'zod';
import { createOrderAsynchronously } from './orders/asyncOrderRequests';
import { type OrderAction, singleTriggerDate } from './orders/orderActions';
import type {
	CreateOrderRequest,
	PreviewOrderRequest,
} from './orders/orderRequests';
import { previewOrderRequest } from './orders/orderRequests';
import { zuoraDateFormat } from './utils';
import type { ZuoraClient } from './zuoraClient';

export type DiscountOrderInput = {
	subscriptionNumber: string;
	accountNumber: string;
	termStartDate: Dayjs;
	termEndDate: Dayjs;
	today: Dayjs;
	applyFromDate: Dayjs;
	discountProductRatePlanId: string;
};

const addDiscountAction = (input: DiscountOrderInput): OrderAction => ({
	type: 'AddProduct',
	triggerDates: singleTriggerDate(input.applyFromDate),
	addProduct: {
		productRatePlanId: input.discountProductRatePlanId,
	},
});

const changeTermEnd = (endDate: Dayjs, applyFromDate: Dayjs): OrderAction => ({
	type: 'TermsAndConditions',
	triggerDates: singleTriggerDate(applyFromDate),
	termsAndConditions: {
		lastTerm: {
			termType: 'TERMED',
			endDate: zuoraDateFormat(endDate),
		},
	},
});

const termExtensionIfRequired = ({
	termEndDate,
	applyFromDate,
}: Pick<DiscountOrderInput, 'termEndDate' | 'applyFromDate'>): OrderAction[] =>
	applyFromDate.isAfter(termEndDate)
		? [changeTermEnd(applyFromDate, applyFromDate)]
		: [];

export const buildDiscountOrderRequest = (
	input: DiscountOrderInput,
): CreateOrderRequest => ({
	orderDate: zuoraDateFormat(input.today),
	existingAccountNumber: input.accountNumber,
	subscriptions: [
		{
			subscriptionNumber: input.subscriptionNumber,
			orderActions: [
				...termExtensionIfRequired(input),
				addDiscountAction(input),
			],
		},
	],
	processingOptions: {
		runBilling: false,
		collectPayment: false,
	},
});

export const buildPreviewDiscountOrderRequest = (
	input: DiscountOrderInput,
): PreviewOrderRequest => ({
	orderDate: zuoraDateFormat(input.today),
	existingAccountNumber: input.accountNumber,
	subscriptions: [
		{
			subscriptionNumber: input.subscriptionNumber,
			orderActions: [
				changeTermEnd(
					input.termStartDate.add(24, 'month'),
					input.applyFromDate,
				),
				addDiscountAction(input),
			],
		},
	],
	previewOptions: {
		previewThruType: 'SpecificDate',
		previewTypes: ['BillingDocs'],
		specificPreviewThruDate: zuoraDateFormat(input.applyFromDate),
	},
});

/**
 * https://developer.zuora.com/v1-api-reference/api/orders/post_createorderasynchronously
 */
export const addDiscount = async (
	zuoraClient: ZuoraClient,
	input: DiscountOrderInput,
	maximumDurationInMilliseconds = 18_000,
): Promise<void> => {
	await createOrderAsynchronously(
		zuoraClient,
		buildDiscountOrderRequest(input),
		maximumDurationInMilliseconds,
	);
};

const discountPreviewInvoiceItemSchema = z.object({
	amountWithoutTax: z.number(),
	taxAmount: z.number(),
});

const discountPreviewInvoiceSchema = z.object({
	targetDate: z.coerce.date(),
	invoiceItems: z.array(discountPreviewInvoiceItemSchema),
});

export const discountPreviewResponseSchema = z.object({
	success: z.boolean(),
	previewResult: z.object({
		invoices: z.array(discountPreviewInvoiceSchema),
	}),
});

export type DiscountPreview = z.infer<typeof discountPreviewResponseSchema>;

export const previewDiscount = async (
	zuoraClient: ZuoraClient,
	input: DiscountOrderInput,
): Promise<DiscountPreview> =>
	previewOrderRequest(
		zuoraClient,
		buildPreviewDiscountOrderRequest(input),
		discountPreviewResponseSchema,
	);
