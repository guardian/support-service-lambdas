import type { IsoCurrency } from '@modules/internationalisation/currency';
import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
import type { ProductPurchase } from '@modules/product-catalog/productPurchaseSchema';
import dayjs from 'dayjs';
import { z } from 'zod';
import { getChargeOverride } from '@modules/zuora/createSubscription/chargeOverride';
import { isDeliveryProduct } from '@modules/zuora/createSubscription/productSpecificFields';
import type { ProductSpecificFields } from '@modules/zuora/createSubscription/productSpecificFields';
import { getSubscriptionDates } from '@modules/zuora/createSubscription/subscriptionDates';
import { buildNewAccountObject } from '@modules/zuora/orders/newAccount';
import type { Contact } from '@modules/zuora/orders/newAccount';
import { buildCreateSubscriptionOrderAction } from '@modules/zuora/orders/orderActions';
import { executeOrderRequest } from '@modules/zuora/orders/orderRequests';
import type { AnyOrderRequest } from '@modules/zuora/orders/orderRequests';
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

type CreateSubscriptionInputFields<T extends PaymentMethod> = {
	accountName: string;
	createdRequestId: string;
	salesforceAccountId: string;
	salesforceContactId: string;
	identityId: string;
	currency: IsoCurrency;
	paymentGateway: PaymentGateway<T>;
	paymentMethod: T;
	billToContact: Contact;
	productSpecificFields: ProductSpecificFields;
	runBilling?: boolean;
	collectPayment?: boolean;
};

function getProductRatePlanId<T extends ProductPurchase>(
	productCatalog: ProductCatalog,
	productSpecificFields: ProductSpecificFields<T>,
): string {
	const productCatalogHelper = new ProductCatalogHelper(productCatalog);
	// TODO: Fix up  the types here
	const productRatePlan = productCatalogHelper.getProductRatePlan(
		productSpecificFields.product,
		// @ts-expect-error this is safe, I just can't figure out how to convince TypeScript
		productSpecificFields.ratePlan,
	);
	// @ts-expect-error this is safe, I just can't figure out how to convince TypeScript
	return productRatePlan.id as string;
}

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
		productSpecificFields,
		runBilling,
		collectPayment,
	}: CreateSubscriptionInputFields<T>,
): AnyOrderRequest {
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
		soldToContact: isDeliveryProduct(productSpecificFields)
			? productSpecificFields.soldToContact
			: undefined,
	});
	const { contractEffectiveDate, customerAcceptanceDate } =
		getSubscriptionDates(dayjs(), productSpecificFields);

	const chargeOverride = getChargeOverride(
		productCatalog,
		productSpecificFields,
	);

	const createSubscriptionOrderAction = buildCreateSubscriptionOrderAction({
		productRatePlanId: getProductRatePlanId(
			productCatalog,
			productSpecificFields,
		),
		contractEffectiveDate: contractEffectiveDate,
		customerAcceptanceDate: customerAcceptanceDate,
		chargeOverride: chargeOverride,
		deliveryAgent:
			productSpecificFields.product === 'NationalDelivery'
				? productSpecificFields.deliveryAgent
				: undefined,
	});
	return {
		newAccount: newAccount,
		orderDate: zuoraDateFormat(dayjs()),
		description: `Created by createSubscription.ts in support-service-lambdas`,
		subscriptions: [
			{
				orderActions: [createSubscriptionOrderAction],
			},
		],
		processingOptions: {
			runBilling: runBilling ?? false,
			collectPayment: collectPayment ?? false,
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
	);
};
