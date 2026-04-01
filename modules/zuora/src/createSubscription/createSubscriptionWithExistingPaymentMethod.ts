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
import type {
	ExistingPaymentMethod,
	PaymentMethod,
} from '@modules/zuora/orders/paymentMethods';
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
	// Less strongly typed than PaymentGateway<T> — the PM type is not known at
	// compile time when using an existing payment method ID.
	paymentGateway: string;
	existingPaymentMethod: ExistingPaymentMethod;
};

// Builds the new account object for the existing-payment-method path.
// paymentMethod differs per case (inline CCRT/PayPal vs undefined).
function buildExistingPaymentMethodNewAccount(
	input: CreateSubscriptionWithExistingPaymentMethodInput,
	paymentMethod?: Record<string, unknown>,
) {
	const { deliveryContact } = {
		deliveryContact: undefined,
		...input.productPurchase,
	};
	return {
		name: input.accountName,
		currency: input.currency,
		crmId: input.salesforceAccountId,
		customFields: {
			sfContactId__c: input.salesforceContactId,
			IdentityId__c: input.identityId,
			CreatedRequestId__c: input.createdRequestId,
		},
		billCycleDay: 0 as const,
		autoPay: true,
		paymentGateway: input.paymentGateway,
		paymentMethod,
		billToContact: input.billToContact,
		soldToContact: deliveryContact,
	};
}

// Resolves the payment method to use when creating a new account.
// - requiresCloning: false — returns the existing PM id directly.
// - requiresCloning: true, Bacs — creates an orphan PM and returns its id.
// - requiresCloning: true, CCRT/PayPal — returns the PM details to embed inline in the order.
async function clonePaymentMethod(
	zuoraClient: ZuoraClient,
	existingPaymentMethod: ExistingPaymentMethod,
): Promise<{
	paymentMethodIdForAccount: string;
	inlinePaymentMethod?: Record<string, string>;
}> {
	if (!existingPaymentMethod.requiresCloning) {
		return { paymentMethodIdForAccount: existingPaymentMethod.id };
	}

	const zuoraPaymentMethod = await getPaymentMethodById(
		zuoraClient,
		existingPaymentMethod.id,
	);

	if (zuoraPaymentMethod.type === 'CreditCard') {
		// Zuora only returns a masked card number (e.g. ****1234) for PCI-DSS
		// compliance — cannot be used to create a new payment method.
		throw new Error(
			`CreditCard payment method is not supported for cloning, ` +
				`only CreditCardReferenceTransaction, PayPal, or BankTransfer.`,
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

		// Create an orphan PM (no accountKey), then assign it via hpmCreditCardPaymentMethodId.
		const pmIdForAccount = await createBankTransferPaymentMethod(zuoraClient, {
			type: zuoraPaymentMethod.type,
			accountNumber,
			bankCode,
			accountHolderInfo: { accountHolderName },
			mandateInfo: { mandateId },
		});
		return { paymentMethodIdForAccount: pmIdForAccount };
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
	} else if (
		zuoraPaymentMethod.type === 'PayPalNativeEC' ||
		zuoraPaymentMethod.type === 'PayPalCP'
	) {
		if (!zuoraPaymentMethod.BAID || !zuoraPaymentMethod.email) {
			throw new Error(
				`PayPal payment method ${zuoraPaymentMethod.id} is missing BAID or email`,
			);
		}
		return {
			paymentMethodIdForAccount: zuoraPaymentMethod.id,
			inlinePaymentMethod: {
				type: zuoraPaymentMethod.type,
				BAID: zuoraPaymentMethod.BAID,
				email: zuoraPaymentMethod.email,
			},
		};
	} else {
		throw new Error(
			`Unsupported payment method type for cloning: ${zuoraPaymentMethod.type}. ` +
				`Only CreditCardReferenceTransaction, PayPal, and BankTransfer are supported.`,
		);
	}
}

// Creates a new Zuora account and subscription using a pre-existing Zuora payment method ID.
//
// If requiresCloning is true, the PM lives on another account and must be re-created first:
//   - Bacs: create an orphan PM (no accountKey), then use its ID as hpmCreditCardPaymentMethodId.
//   - CCRT/PayPal: embed the PM details inline in newAccount.paymentMethod.
//   - CreditCard: not supported (masked number cannot be re-used).
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

	const { contractEffectiveDate, orderAction } = buildSubscriptionOrderAction(
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

	const headers = { 'idempotency-key': createdRequestId };

	const { paymentMethodIdForAccount, inlinePaymentMethod } =
		await clonePaymentMethod(zuoraClient, existingPaymentMethod);

	const orderRequest = {
		newAccount: {
			...buildExistingPaymentMethodNewAccount(input, inlinePaymentMethod),
			...(inlinePaymentMethod === undefined && {
				hpmCreditCardPaymentMethodId: paymentMethodIdForAccount,
			}),
		},
		orderDate: zuoraDateFormat(contractEffectiveDate),
		description: 'Created by createSubscription.ts in support-service-lambdas',
		subscriptions: [
			{ orderActions: [orderAction], customFields: subscriptionCustomFields },
		],
		processingOptions: {
			runBilling: runBilling ?? true,
			collectPayment: collectPayment ?? true,
		},
	};

	return zuoraClient.post(
		'/v1/orders',
		JSON.stringify(orderRequest),
		createSubscriptionResponseSchema,
		headers,
	);
};
