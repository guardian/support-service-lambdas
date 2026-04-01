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
	type BankTransferCloneInput,
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
	pmIdForAccount: string;
	inlinePaymentMethod?: Record<string, string>;
}> {
	if (!existingPaymentMethod.requiresCloning) {
		return { pmIdForAccount: existingPaymentMethod.id };
	}

	const pm = await getPaymentMethodById(zuoraClient, existingPaymentMethod.id);

	if (pm.type === 'CreditCard') {
		// Zuora only returns a masked card number (e.g. ****1234) for PCI-DSS
		// compliance — cannot be used to create a new payment method.
		throw new Error(
			`CreditCard payment method is not supported for cloning, ` +
				`only CreditCardReferenceTransaction, PayPal, or BankTransfer.`,
		);
	} else if (pm.type === 'Bacs') {
		const bankTransferPm: BankTransferCloneInput = {
			type: pm.type,
			accountNumber: pm.accountNumber ?? '',
			bankCode: pm.bankCode ?? '',
			accountHolderInfo: {
				accountHolderName: pm.accountHolderInfo?.accountHolderName ?? null,
			},
			mandateInfo: {
				mandateId: pm.mandateInfo?.mandateId ?? null,
				mandateReason: pm.mandateInfo?.mandateReason ?? null,
				mandateStatus: pm.mandateInfo?.mandateStatus ?? null,
			},
		};
		// Create an orphan PM (no accountKey), then assign it via hpmCreditCardPaymentMethodId.
		const pmIdForAccount = await createBankTransferPaymentMethod(
			zuoraClient,
			undefined,
			bankTransferPm,
		);
		return { pmIdForAccount };
	} else if (pm.type === 'CreditCardReferenceTransaction') {
		if (!pm.tokenId || !pm.secondTokenId) {
			throw new Error(
				`CreditCardReferenceTransaction payment method ${pm.id} is missing tokenId or secondTokenId`,
			);
		}
		return {
			pmIdForAccount: pm.id,
			inlinePaymentMethod: {
				type: pm.type,
				tokenId: pm.tokenId,
				secondTokenId: pm.secondTokenId,
			},
		};
	} else if (pm.type === 'PayPalNativeEC' || pm.type === 'PayPalCP') {
		if (!pm.BAID || !pm.email) {
			throw new Error(
				`PayPal payment method ${pm.id} is missing BAID or email`,
			);
		}
		return {
			pmIdForAccount: pm.id,
			inlinePaymentMethod: { type: pm.type, BAID: pm.BAID, email: pm.email },
		};
	} else {
		throw new Error(
			`Unsupported payment method type for cloning: ${pm.type}. ` +
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

	const { pmIdForAccount, inlinePaymentMethod } = await clonePaymentMethod(
		zuoraClient,
		existingPaymentMethod,
	);

	const orderRequest = {
		newAccount: {
			...buildExistingPaymentMethodNewAccount(input, inlinePaymentMethod),
			...(inlinePaymentMethod === undefined && {
				hpmCreditCardPaymentMethodId: pmIdForAccount,
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
