import { CurrencyValues } from '@modules/internationalisation/currency';
import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import type { ProductPurchase } from '@modules/product-catalog/productPurchaseSchema';
import type { AppliedPromotion, Promo } from '@modules/promotions/v2/schema';
import dayjs from 'dayjs';
import { z } from 'zod';
import { buildCreateSubscriptionOrderAction } from '../orders/orderActions';
import type { CreateOrderRequest } from '../orders/orderRequests';
import { executeOrderRequest } from '../orders/orderRequests';
import { zuoraDateFormat } from '../utils';
import type { ZuoraClient } from '../zuoraClient';
import { getChargeOverride } from './chargeOverride';
import {
	type CreateSubscriptionResponse,
	createSubscriptionResponseSchema,
	getPromotionInputFields,
} from './createSubscription';
import { getProductRatePlan } from './getProductRatePlan';
import { ReaderType } from './readerType';
import { getSubscriptionDates } from './subscriptionDates';

// Minimal schema to fetch only the fields needed from an existing account
const existingAccountDetailsSchema = z.object({
	basicInfo: z.object({ accountNumber: z.string() }),
	billingAndPayment: z.object({
		currency: z.enum(CurrencyValues),
	}),
});

type ExistingAccountDetails = z.infer<typeof existingAccountDetailsSchema>;

export type CreateSubscriptionForExistingAccountInput = {
	accountNumber: string;
	productPurchase: ProductPurchase;
	createdRequestId?: string;
	appliedPromotion?: AppliedPromotion;
	runBilling?: boolean;
	collectPayment?: boolean;
};

export const createSubscriptionForExistingAccount = async (
	zuoraClient: ZuoraClient,
	productCatalog: ProductCatalog,
	{
		accountNumber,
		productPurchase,
		createdRequestId,
		appliedPromotion,
		runBilling,
		collectPayment,
	}: CreateSubscriptionForExistingAccountInput,
	promotion: Promo | undefined,
): Promise<CreateSubscriptionResponse> => {
	const account: ExistingAccountDetails = await zuoraClient.get(
		`v1/accounts/${accountNumber}`,
		existingAccountDetailsSchema,
	);

	const { contractEffectiveDate, customerAcceptanceDate } =
		getSubscriptionDates(dayjs(), productPurchase);

	const chargeOverride = getChargeOverride(
		productCatalog,
		productPurchase,
		account.billingAndPayment.currency,
	);

	const productRatePlan = getProductRatePlan(productCatalog, productPurchase);

	const promotionInputFields = getPromotionInputFields(
		appliedPromotion,
		promotion,
		productRatePlan.id,
		productCatalog,
		productPurchase.product,
	);

	const createSubscriptionOrderAction = buildCreateSubscriptionOrderAction({
		productRatePlanId: productRatePlan.id,
		contractEffectiveDate,
		customerAcceptanceDate,
		chargeOverride,
		promotionInputFields,
		termType: productRatePlan.termType,
		termLengthInMonths: productRatePlan.termLengthInMonths,
	});

	const subscriptionCustomFields = {
		LastPlanAddedDate__c: zuoraDateFormat(contractEffectiveDate),
		ReaderType__c: ReaderType.Direct,
		...(appliedPromotion && {
			InitialPromotionCode__c: appliedPromotion.promoCode,
			PromotionCode__c: appliedPromotion.promoCode,
		}),
	};

	const orderRequest: CreateOrderRequest = {
		existingAccountNumber: account.basicInfo.accountNumber,
		orderDate: zuoraDateFormat(contractEffectiveDate),
		description:
			'Created by createSubscriptionForExistingAccount.ts in support-service-lambdas',
		subscriptions: [
			{
				orderActions: [createSubscriptionOrderAction],
				customFields: subscriptionCustomFields,
			},
		],
		processingOptions: {
			runBilling: runBilling ?? true,
			collectPayment: collectPayment ?? true,
		},
	};

	return executeOrderRequest(
		zuoraClient,
		orderRequest,
		createSubscriptionResponseSchema,
		createdRequestId,
	);
};
