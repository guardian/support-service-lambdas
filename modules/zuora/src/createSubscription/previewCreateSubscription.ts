import type { IsoCurrency } from '@modules/internationalisation/currency';
import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import type { ProductPurchase } from '@modules/product-catalog/productPurchaseSchema';
import type {
	AppliedPromotion,
	Promotion,
} from '@modules/promotions/v1/schema';
import type { Stage } from '@modules/stage';
import dayjs from 'dayjs';
import { z } from 'zod';
import { getChargeOverride } from '@modules/zuora/createSubscription/chargeOverride';
import { getPromotionInputFields } from '@modules/zuora/createSubscription/createSubscription';
import { getProductRatePlan } from '@modules/zuora/createSubscription/getProductRatePlan';
import { getSubscriptionDates } from '@modules/zuora/createSubscription/subscriptionDates';
import { buildCreateSubscriptionOrderAction } from '@modules/zuora/orders/orderActions';
import type { PreviewOrderRequest } from '@modules/zuora/orders/orderRequests';
import { previewOrderRequest } from '@modules/zuora/orders/orderRequests';
import { zuoraDateFormat } from '@modules/zuora/utils';
import { dateFromStringSchema } from '@modules/zuora/utils/dateFromStringSchema';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';

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
	const promotionInputFields = getPromotionInputFields(
		appliedPromotion,
		promotions,
		productRatePlan.id,
		productCatalog,
		productPurchase.product,
	);

	const numberOfMonthsToPreview = 13; // 13 allows for annual subs to have a second invoice
	const initialTermLengthInMonths = 14; // This is to work round an issue where Zuora cuts off the preview at the term end date

	const createSubscriptionOrderAction = buildCreateSubscriptionOrderAction({
		productRatePlanId: productRatePlan.id,
		contractEffectiveDate: contractEffectiveDate,
		customerAcceptanceDate: customerAcceptanceDate,
		chargeOverride: chargeOverride,
		promotionInputFields: promotionInputFields,
		termType: productRatePlan.termType,
		termLengthInMonths: initialTermLengthInMonths,
	});

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
