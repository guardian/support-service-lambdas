import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import type { Promo } from '@modules/promotions/v2/schema';
import { clonePaymentMethod } from '@modules/zuora/createSubscription/clonePaymentMethod';
import type {
	CreateSubscriptionResponse,
	CreateSubscriptionWithExistingPaymentMethodInputFields,
} from '@modules/zuora/createSubscription/createSubscription';
import {
	buildCreateSubscriptionRequest,
	createSubscriptionResponseSchema,
} from '@modules/zuora/createSubscription/createSubscription';
import { executeOrderRequest } from '@modules/zuora/orders/orderRequests';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';

// Represents a Zuora payment method ID provided by the caller.
// requiresCloning: false — the PM exists but is not yet attached to any account;
// requiresCloning: true — the PM is attached to an existing account and must be cloned before use.
export type ExistingPaymentMethodInput = {
	id: string;
	requiresCloning: boolean;
};

export type CreateSubscriptionWithExistingPaymentMethodInput = Omit<
	CreateSubscriptionWithExistingPaymentMethodInputFields,
	'paymentMethod'
> & {
	existingPaymentMethod: ExistingPaymentMethodInput;
};

// Creates a new Zuora account and subscription using a pre-existing Zuora payment method ID.
// If requiresCloning is false, the existing PM id is passed directly to Zuora in the hpmCreditCardPaymentMethodId
// parameter - https://developer.zuora.com/v1-api-reference/api/orders/post_order#orders/post_order/t=request&path=newaccount/hpmcreditcardpaymentmethodid
// If requiresCloning is true, the payment method is already attached to another account and must be re-created first:
//   - BankTransfer: create an orphan payment method (no accountKey), then use its ID directly as above.
//   - CreditCardReferenceTransaction: embed the payment method details inline in newAccount.paymentMethod.
//   - CreditCard/PayPal: not supported (CreditCard has masked number; PayPal tokens are not reliably available).
// More details in the associated PR: https://github.com/guardian/support-service-lambdas/pull/3503
export const createSubscriptionWithExistingPaymentMethod = async (
	zuoraClient: ZuoraClient,
	productCatalog: ProductCatalog,
	input: CreateSubscriptionWithExistingPaymentMethodInput,
	promotion: Promo | undefined,
): Promise<CreateSubscriptionResponse> => {
	const paymentMethod = await clonePaymentMethod(
		zuoraClient,
		input.existingPaymentMethod,
	);

	return executeOrderRequest(
		zuoraClient,
		buildCreateSubscriptionRequest(
			productCatalog,
			{ ...input, paymentMethod },
			promotion,
		),
		createSubscriptionResponseSchema,
		input.createdRequestId,
	);
};
