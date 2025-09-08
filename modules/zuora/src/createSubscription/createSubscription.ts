import type { IsoCurrency } from '@modules/internationalisation/currency';
import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import type { ProductPurchase } from '@modules/product-catalog/productPurchaseSchema';
import dayjs from 'dayjs';
import { z } from 'zod';
import { getChargeOverride } from '@modules/zuora/createSubscription/chargeOverride';
import { getProductRatePlan } from '@modules/zuora/createSubscription/getProductRatePlan';
import type { GiftRecipient } from '@modules/zuora/createSubscription/giftRecipient';
import { ReaderType } from '@modules/zuora/createSubscription/readerType';
import { getSubscriptionDates } from '@modules/zuora/createSubscription/subscriptionDates';
import type { Contact } from '@modules/zuora/orders/newAccount';
import { buildNewAccountObject } from '@modules/zuora/orders/newAccount';
import { buildCreateSubscriptionOrderAction } from '@modules/zuora/orders/orderActions';
import type { CreateOrderRequest } from '@modules/zuora/orders/orderRequests';
import { executeOrderRequest } from '@modules/zuora/orders/orderRequests';
import type {
	PaymentGateway,
	PaymentMethod,
} from '@modules/zuora/orders/paymentMethods';
import { zuoraDateFormat } from '@modules/zuora/utils';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';

const createSubscriptionResponseSchema = z.object({
	orderNumber: z.string(),
	accountNumber: z.string(),
	subscriptionNumbers: z.array(z.string()),
	invoiceNumbers: z.array(z.string()).optional(),
	paymentNumber: z.string().optional(),
	paidAmount: z.number().optional(),
});

export type CreateSubscriptionResponse = z.infer<
	typeof createSubscriptionResponseSchema
>;

export type CreateSubscriptionInputFields<T extends PaymentMethod> = {
	accountName: string;
	createdRequestId: string;
	salesforceAccountId: string;
	salesforceContactId: string;
	identityId: string;
	currency: IsoCurrency;
	paymentGateway: PaymentGateway<T>;
	paymentMethod: T;
	billToContact: Contact;
	productPurchase: ProductPurchase;
	giftRecipient?: GiftRecipient;
	runBilling?: boolean;
	collectPayment?: boolean;
};

function buildCreateSubscriptionRequest<T extends PaymentMethod>(
	productCatalog: ProductCatalog,
	{
		accountName,
		createdRequestId,
		salesforceAccountId,
		salesforceContactId,
		identityId,
		currency,
		paymentGateway,
		paymentMethod,
		billToContact,
		productPurchase,
		giftRecipient,
		runBilling,
		collectPayment,
	}: CreateSubscriptionInputFields<T>,
): CreateOrderRequest {
	// TODO:
	//  Apply promotion if present
	//  ReaderType - GIFT ✅, PATRON
	//  DeliveryAgent ✅
	//  Set contribution amount correctly for S+ (amount - cost) ✅
	//  Set term & autoRenew correctly for GW gifts (and S+ students?)
	const { deliveryContact, deliveryAgent, deliveryInstructions } = {
		deliveryContact: undefined,
		deliveryAgent: '',
		deliveryInstructions: undefined,
		...productPurchase,
	};

	const newAccount = buildNewAccountObject({
		accountName: accountName,
		createdRequestId: createdRequestId,
		salesforceAccountId: salesforceAccountId,
		salesforceContactId: salesforceContactId,
		identityId: identityId,
		currency: currency,
		paymentGateway: paymentGateway,
		paymentMethod: paymentMethod,
		billToContact: billToContact,
		soldToContact: deliveryContact,
		deliveryInstructions: deliveryInstructions,
	});
	const { contractEffectiveDate, customerAcceptanceDate } =
		getSubscriptionDates(dayjs(), productPurchase);

	const chargeOverride = getChargeOverride(
		productCatalog,
		productPurchase,
		currency,
	);
	const readerType = giftRecipient ? ReaderType.Gift : ReaderType.Direct; // TODO: patron if there is a patron promo

	const createSubscriptionOrderAction = buildCreateSubscriptionOrderAction({
		productRatePlanId: getProductRatePlan(productCatalog, productPurchase).id,
		contractEffectiveDate: contractEffectiveDate,
		customerAcceptanceDate: customerAcceptanceDate,
		chargeOverride: chargeOverride,
	});

	const customFields = {
		DeliveryAgent__c: deliveryAgent.toString(),
		ReaderType__c: readerType,
	};
	return {
		newAccount: newAccount,
		orderDate: zuoraDateFormat(dayjs()),
		description: `Created by createSubscription.ts in support-service-lambdas`,
		subscriptions: [
			{
				orderActions: [createSubscriptionOrderAction],
				customFields: customFields,
			},
		],
		processingOptions: {
			runBilling: runBilling ?? true,
			collectPayment: collectPayment ?? true,
		},
	};
}
export const createSubscription = async <T extends PaymentMethod>(
	zuoraClient: ZuoraClient,
	productCatalog: ProductCatalog,
	inputFields: CreateSubscriptionInputFields<T>,
): Promise<CreateSubscriptionResponse> => {
	return executeOrderRequest(
		zuoraClient,
		buildCreateSubscriptionRequest(productCatalog, inputFields),
		createSubscriptionResponseSchema,
		inputFields.createdRequestId,
	);
};
