import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import type { Promo } from '@modules/promotions/v2/schema';
import type {
	CreateSubscriptionInputFields,
	CreateSubscriptionResponse,
} from '@modules/zuora/createSubscription/createSubscription';
import { getReaderType } from '@modules/zuora/createSubscription/createSubscription';
import {
	buildSubscriptionOrderAction,
	createSubscriptionResponseSchema,
} from '@modules/zuora/createSubscription/createSubscription';
import { buildNewAccountObject } from '@modules/zuora/orders/newAccount';
import { executeOrderRequest } from '@modules/zuora/orders/orderRequests';
import type {
	ClonedCreditCardReferenceTransaction,
	ExistingPaymentMethod,
	PaymentMethod,
} from '@modules/zuora/orders/paymentMethods';
import { paymentGatewaySchema } from '@modules/zuora/orders/paymentMethods';
import {
	createBankTransferPaymentMethod,
	getPaymentMethodById,
} from '@modules/zuora/paymentMethod';
import { zuoraDateFormat } from '@modules/zuora/utils';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';

export type CreateSubscriptionWithExistingPaymentMethodInput = Omit<
	CreateSubscriptionInputFields<PaymentMethod>,
	'paymentGateway' | 'paymentMethod'
> & {
	// Less strongly typed than PaymentGateway<T> — the payment method type is not known at
	// compile time when using an existing payment method ID.
	paymentGateway: string;
	existingPaymentMethod: ExistingPaymentMethod;
};

// Resolves the payment method to use when creating a new account.
// - requiresCloning: false — returns the existing payment method id directly.
// - requiresCloning: true, Bacs — creates an orphan payment method and returns its id.
// - requiresCloning: true, CreditCardReferenceTransaction — returns the payment method details to embed inline in the order.
// - requiresCloning: true, CreditCard/PayPal — not supported; throws an error.
async function clonePaymentMethod(
	zuoraClient: ZuoraClient,
	existingPaymentMethod: ExistingPaymentMethod,
): Promise<{
	paymentMethodIdForAccount: string;
	inlinePaymentMethod?: ClonedCreditCardReferenceTransaction;
}> {
	if (!existingPaymentMethod.requiresCloning) {
		return { paymentMethodIdForAccount: existingPaymentMethod.id };
	}

	const zuoraPaymentMethod = await getPaymentMethodById(
		zuoraClient,
		existingPaymentMethod.id,
	);

	if (
		zuoraPaymentMethod.type === 'CreditCard' ||
		zuoraPaymentMethod.type === 'PayPalNativeEC' ||
		zuoraPaymentMethod.type === 'PayPalCP'
	) {
		// Zuora does not return a full card number for CreditCard payment methods
		// or a vault token for PayPalCP payment methods so cloning is not supported.
		// We could clone older PayPal payment methods of type PayPalNativeEC but
		// the added complexity was not judged to be worth the effort
		throw new Error(
			`${zuoraPaymentMethod.type} payment method is not supported for cloning, ` +
				`only CreditCardReferenceTransaction or BankTransfer.`,
		);
	} else if (zuoraPaymentMethod.type === 'Bacs') {
		const { accountNumber, bankCode } = zuoraPaymentMethod;
		const accountHolderName =
			zuoraPaymentMethod.accountHolderInfo?.accountHolderName;
		const mandateId = zuoraPaymentMethod.mandateInfo?.mandateId;
		if (!accountNumber) {
			throw new Error(
				`Bacs payment method ${zuoraPaymentMethod.id} is missing accountNumber`,
			);
		}
		if (!bankCode) {
			throw new Error(
				`Bacs payment method ${zuoraPaymentMethod.id} is missing bankCode`,
			);
		}
		if (!accountHolderName) {
			throw new Error(
				`Bacs payment method ${zuoraPaymentMethod.id} is missing accountHolderInfo.accountHolderName`,
			);
		}
		if (!mandateId) {
			throw new Error(
				`Bacs payment method ${zuoraPaymentMethod.id} is missing mandateInfo.mandateId`,
			);
		}

		// Create an orphan payment method (no accountKey), then assign it via hpmCreditCardPaymentMethodId.
		const paymentMethodIdForAccount = await createBankTransferPaymentMethod(
			zuoraClient,
			{
				type: zuoraPaymentMethod.type,
				accountNumber,
				bankCode,
				accountHolderInfo: { accountHolderName },
				mandateInfo: { mandateId },
			},
		);
		return { paymentMethodIdForAccount };
	} else if (zuoraPaymentMethod.type === 'CreditCardReferenceTransaction') {
		if (!zuoraPaymentMethod.tokenId || !zuoraPaymentMethod.secondTokenId) {
			throw new Error(
				`CreditCardReferenceTransaction payment method ${zuoraPaymentMethod.id} is missing tokenId or secondTokenId`,
			);
		}
		return {
			paymentMethodIdForAccount: zuoraPaymentMethod.id,
			inlinePaymentMethod: {
				type: zuoraPaymentMethod.type,
				tokenId: zuoraPaymentMethod.tokenId,
				secondTokenId: zuoraPaymentMethod.secondTokenId,
			},
		};
	} else {
		throw new Error(
			`Unsupported payment method type for cloning: ${zuoraPaymentMethod.type}. ` +
				`Only CreditCardReferenceTransaction and BankTransfer are supported.`,
		);
	}
}

// Creates a new Zuora account and subscription using a pre-existing Zuora payment method ID.
//
// If requiresCloning is true, the payment method lives on another account and must be re-created first:
//   - Bacs: create an orphan payment method (no accountKey), then use its ID as hpmCreditCardPaymentMethodId.
//   - CreditCardReferenceTransaction: embed the payment method details inline in newAccount.paymentMethod.
//   - CreditCard/PayPal: not supported (CreditCard has masked number; PayPal tokens are not reliably available).
// If requiresCloning is false, the existing PM id is used directly as hpmCreditCardPaymentMethodId.
// All paths converge into a single orderRequest + zuoraClient.post call.
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

	const { paymentMethodIdForAccount, inlinePaymentMethod } =
		await clonePaymentMethod(zuoraClient, existingPaymentMethod);

	const { deliveryContact } = {
		deliveryContact: undefined,
		...input.productPurchase,
	};

	const orderRequest = {
		newAccount: {
			...buildNewAccountObject<
				PaymentMethod | ClonedCreditCardReferenceTransaction
			>({
				accountName: input.accountName,
				createdRequestId: input.createdRequestId,
				salesforceAccountId: input.salesforceAccountId,
				salesforceContactId: input.salesforceContactId,
				identityId: input.identityId,
				currency: input.currency,
				paymentGateway: paymentGatewaySchema.parse(input.paymentGateway),
				paymentMethod: inlinePaymentMethod,
				billToContact: input.billToContact,
				soldToContact: deliveryContact,
			}),
			...(inlinePaymentMethod === undefined && {
				hpmCreditCardPaymentMethodId: paymentMethodIdForAccount,
			}),
		},
		orderDate: zuoraDateFormat(contractEffectiveDate),
		description: 'Created by createSubscription.ts in support-service-lambdas',
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
