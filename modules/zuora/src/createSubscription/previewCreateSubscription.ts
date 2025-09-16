import type { IsoCurrency } from '@modules/internationalisation/currency';
import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import type { ProductPurchase } from '@modules/product-catalog/productPurchaseSchema';
import dayjs from 'dayjs';
import { z } from 'zod';
import { getChargeOverride } from '@modules/zuora/createSubscription/chargeOverride';
import { getProductRatePlan } from '@modules/zuora/createSubscription/getProductRatePlan';
import { getSubscriptionDates } from '@modules/zuora/createSubscription/subscriptionDates';
import { buildCreateSubscriptionOrderAction } from '@modules/zuora/orders/orderActions';
import { previewOrderRequest } from '@modules/zuora/orders/orderRequests';
import type { PreviewOrderRequest } from '@modules/zuora/orders/orderRequests';
import { zuoraDateFormat } from '@modules/zuora/utils';
import { dateFromStringSchema } from '@modules/zuora/utils/dateFromStringSchema';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { Stage } from '@modules/stage';
import { AppliedPromotion, Promotion } from '@modules/promotions/schema';
import { validatePromotion } from '@modules/promotions/validatePromotion';

export type PreviewCreateSubscriptionInputFields = {
	stage: Stage;
	accountNumber: string;
	currency: IsoCurrency;
	productPurchase: ProductPurchase;
	appliedPromotion?: AppliedPromotion;
};

export const previewCreateSubscription = async (
	zuoraClient: ZuoraClient,
	productCatalog: ProductCatalog,
	promotions: Promotion[],
	{
		stage,
		accountNumber,
		currency,
		productPurchase,
		appliedPromotion,
	}: PreviewCreateSubscriptionInputFields,
): Promise<PreviewCreateSubscriptionResponse> => {
	const { contractEffectiveDate, customerAcceptanceDate } =
		getSubscriptionDates(dayjs(), productPurchase);

	const chargeOverride = getChargeOverride(
		productCatalog,
		productPurchase,
		currency,
	);

	const productRatePlan = getProductRatePlan(productCatalog, productPurchase);
	const validatedPromotion = appliedPromotion
		? validatePromotion(promotions, appliedPromotion, productRatePlan.id)
		: undefined;

	const createSubscriptionOrderAction = buildCreateSubscriptionOrderAction({
		stage: stage,
		productRatePlanId: productRatePlan.id,
		contractEffectiveDate: contractEffectiveDate,
		customerAcceptanceDate: customerAcceptanceDate,
		chargeOverride: chargeOverride,
		validatedPromotion: validatedPromotion,
		termType: productRatePlan.termType,
		termLengthInMonths: productRatePlan.termLengthInMonths,
	});

	const numberOfMonthsToPreview = 13; // 13 allows for annual subs to have a second invoice
	const orderRequest: PreviewOrderRequest = {
		existingAccountNumber: accountNumber,
		orderDate: zuoraDateFormat(dayjs()),
		subscriptions: [
			{
				orderActions: [createSubscriptionOrderAction],
			},
		],
		previewOptions: {
			previewThruType: 'SpecificDate',
			previewTypes: ['BillingDocs'],
			specificPreviewThruDate: zuoraDateFormat(
				dayjs().add(numberOfMonthsToPreview, 'month'),
			),
		},
	};

	return previewOrderRequest(
		zuoraClient,
		orderRequest,
		previewCreateSubscriptionResponseSchema,
	);
};

const invoiceItemSchema = z.object({
	serviceStartDate: dateFromStringSchema,
	serviceEndDate: dateFromStringSchema,
	amountWithoutTax: z.number(),
	taxAmount: z.number(),
	chargeName: z.string(),
	productName: z.string(),
	productRatePlanChargeId: z.string(),
	unitPrice: z.number(),
});

const invoiceSchema = z.object({
	amount: z.number(),
	amountWithoutTax: z.number(),
	taxAmount: z.number(),
	targetDate: dateFromStringSchema,
	invoiceItems: z.array(invoiceItemSchema),
});

const previewResultSchema = z.object({
	invoices: z.array(invoiceSchema),
});

export const previewCreateSubscriptionResponseSchema = z.object({
	success: z.boolean(),
	previewResult: previewResultSchema,
});

export type PreviewCreateSubscriptionResponse = z.infer<
	typeof previewCreateSubscriptionResponseSchema
>;
