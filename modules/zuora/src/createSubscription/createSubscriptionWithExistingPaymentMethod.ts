import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import type { Promo } from '@modules/promotions/v2/schema';
import type { ExistingPaymentMethod } from '@modules/zuora/createSubscription/clonePaymentMethod';
import { clonePaymentMethod } from '@modules/zuora/createSubscription/clonePaymentMethod';
import type {
	CreateSubscriptionInputFields,
	CreateSubscriptionResponse,
} from '@modules/zuora/createSubscription/createSubscription';
import {
	buildSubscriptionOrderAction,
	createSubscriptionResponseSchema,
	getReaderType,
} from '@modules/zuora/createSubscription/createSubscription';
import { buildNewAccountObject } from '@modules/zuora/orders/newAccount';
import { executeOrderRequest } from '@modules/zuora/orders/orderRequests';
import type {
	AnyPaymentMethod,
	PaymentGateway,
	PaymentMethod,
} from '@modules/zuora/orders/paymentMethods';
import { zuoraDateFormat } from '@modules/zuora/utils';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';

export type CreateSubscriptionWithExistingPaymentMethodInput = Omit<
	CreateSubscriptionInputFields<PaymentMethod>,
	'paymentGateway' | 'paymentMethod'
> & {
	paymentGateway: PaymentGateway<PaymentMethod>;
	existingPaymentMethod: ExistingPaymentMethod;
};

// Creates a new Zuora account and subscription using a pre-existing Zuora payment method ID.
//
// If requiresCloning is false, the existing PM id is passed directly to Zuora in the hpmCreditCardPaymentMethodId
// parameter - https://developer.zuora.com/v1-api-reference/api/orders/post_order#orders/post_order/t=request&path=newaccount/hpmcreditcardpaymentmethodid
// If requiresCloning is true, the payment method lives on another account and must be re-created first:
//   - Bacs: create an orphan payment method (no accountKey), then use its ID directly as above.
//   - CreditCardReferenceTransaction: embed the payment method details inline in newAccount.paymentMethod.
//   - CreditCard/PayPal: not supported (CreditCard has masked number; PayPal tokens are not reliably available).
export const createSubscriptionWithExistingPaymentMethod = async (
	zuoraClient: ZuoraClient,
	productCatalog: ProductCatalog,
	input: CreateSubscriptionWithExistingPaymentMethodInput,
	promotion: Promo | undefined,
): Promise<CreateSubscriptionResponse> => {
	const {
		existingPaymentMethod,
		appliedPromotion,
		runBilling,
		collectPayment,
		createdRequestId,
		acquisitionCase,
		acquisitionSource,
		createdByCSR,
		giftRecipient,
	} = input;

	const { contractEffectiveDate, createSubscriptionOrderAction } =
		buildSubscriptionOrderAction(
			productCatalog,
			input.productPurchase,
			input.currency,
			appliedPromotion,
			promotion,
		);

	const subscriptionCustomFields = {
		ReaderType__c: getReaderType(giftRecipient, appliedPromotion),
		LastPlanAddedDate__c: zuoraDateFormat(contractEffectiveDate),
		InitialPromotionCode__c: appliedPromotion?.promoCode,
		PromotionCode__c: appliedPromotion?.promoCode,
		CreatedRequestId__c: createdRequestId,
		AcquisitionCase__c: acquisitionCase,
		AcquisitionSource__c: acquisitionSource,
		CreatedByCSR__c: createdByCSR,
	};

	const clonePaymentMethodResult = await clonePaymentMethod(
		existingPaymentMethod,
		zuoraClient,
	);

	const { deliveryContact } = {
		deliveryContact: undefined,
		...input.productPurchase,
	};

	const newAccount = buildNewAccountObject<AnyPaymentMethod>({
		accountName: input.accountName,
		createdRequestId: input.createdRequestId,
		salesforceAccountId: input.salesforceAccountId,
		salesforceContactId: input.salesforceContactId,
		identityId: input.identityId,
		currency: input.currency,
		paymentGateway: input.paymentGateway,
		billToContact: input.billToContact,
		soldToContact: deliveryContact,
	});

	const orderRequest = {
		newAccount: { ...newAccount, ...clonePaymentMethodResult },
		orderDate: zuoraDateFormat(contractEffectiveDate),
		description:
			'Created by createSubscriptionWithExistingPaymentMethod.ts in support-service-lambdas',
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
