import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import {
	AnyOrderRequest,
	executeOrderRequest,
} from '@modules/zuora/orders/orderRequests';
import { z } from 'zod';
import { IsoCurrency } from '@modules/internationalisation/currency';
import {
	buildNewAccountObject,
	Contact,
} from '@modules/zuora/orders/newAccount';
import dayjs from 'dayjs';
import { buildCreateSubscriptionOrderAction } from '@modules/zuora/orders/orderActions';
import { zuoraDateFormat } from '@modules/zuora/utils';
import {
	PaymentGateway,
	PaymentMethod,
} from '@modules/zuora/orders/paymentMethods';
import { ProductPurchase } from '@modules/product-catalog/productPurchaseSchema';
import {
	ProductCatalog,
	ProductKey,
} from '@modules/product-catalog/productCatalog';
import {
	isDeliveryProduct,
	ProductSpecificFields,
} from '@modules/zuora/createSubscription/productSpecificFields';

import { getSubscriptionDates } from '@modules/zuora/createSubscription/subscriptionDates';
import { getChargeOverride } from '@modules/zuora/createSubscription/chargeOverride';

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

type CreateSubscriptionInputFields<
	P extends ProductKey,
	PM extends PaymentMethod,
> = {
	accountName: string;
	createdRequestId: string;
	salesforceAccountId: string;
	salesforceContactId: string;
	identityId: string;
	currency: IsoCurrency;
	paymentGateway: PaymentGateway<PM>;
	paymentMethod: PM;
	billToContact: Contact;
	productSpecificFields: ProductSpecificFields;
	// soldToContact?: Contact;
	// productRatePlanId: string;
	// contractEffectiveDate: Dayjs;
	// customerAcceptanceDate?: Dayjs;
	// chargeOverride?: { productRatePlanChargeId: string; overrideAmount: number };
	// deliveryAgent?: string; // Optional delivery agent for National Delivery products
	runBilling?: boolean;
	collectPayment?: boolean;
};

export function getAmount(
	productInformation: ProductPurchase,
): number | undefined {
	switch (productInformation.product) {
		case 'Contribution':
			return productInformation.amount;
		case 'SupporterPlus':
			return productInformation.amount;
	}
	return;
}

function buildCreateSubscriptionRequest<
	P extends ProductKey,
	PM extends PaymentMethod,
>(
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
	}: CreateSubscriptionInputFields<P, PM>,
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
		productRatePlanId:
			productSpecificFields.productInformation.productRatePlanId,
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
export const createSubscription = async <
	P extends ProductKey,
	PM extends PaymentMethod,
>(
	zuoraClient: ZuoraClient,
	productCatalog: ProductCatalog,
	inputFields: CreateSubscriptionInputFields<P, PM>,
): Promise<CreateSubscriptionResponse> => {
	return executeOrderRequest(
		zuoraClient,
		buildCreateSubscriptionRequest(productCatalog, inputFields),
		createSubscriptionResponseSchema,
	);
};
