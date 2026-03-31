import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import type { Promo } from '@modules/promotions/v2/schema';
import dayjs from 'dayjs';
import { updateAccount } from '@modules/zuora/account';
import { generateBillingDocuments } from '@modules/zuora/invoice';
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
import type {
	CreateSubscriptionInputFields,
	CreateSubscriptionResponse,
} from './createSubscription';
import { getReaderType } from './createSubscription';
import {
	buildSubscriptionOrderAction,
	createSubscriptionResponseSchema,
} from './createSubscription';

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
// autoPay and paymentMethod differ per case; all other fields are constant.
function buildExistingPaymentMethodNewAccount(
	input: CreateSubscriptionWithExistingPaymentMethodInput,
	autoPay: boolean,
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
		autoPay,
		paymentGateway: input.paymentGateway,
		paymentMethod,
		billToContact: input.billToContact,
		soldToContact: deliveryContact,
	};
}

// Creates a new Zuora account and subscription using a pre-existing Zuora payment method ID.
//
// Two modes depending on existingPaymentMethod.requiresCloning:
//   false — the PM is not yet attached to any account; the account is created without a PM
//           and the PM is set as default via updateAccount.
//   true  — the PM lives on another account and must be cloned (re-created via the
//           appropriate Zuora API) before being attached to the new account.
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

	// Two-step flow: create account without PM, then attach the payment method.
	// getPaymentMethodId receives the newly created account number and returns the PM ID to attach.
	const twoStep = async (
		getPaymentMethodId: (accountNumber: string) => Promise<string>,
	): Promise<CreateSubscriptionResponse> => {
		const orderRequest = {
			newAccount: buildExistingPaymentMethodNewAccount(input, false),
			orderDate: zuoraDateFormat(contractEffectiveDate),
			description:
				'Created by createSubscription.ts in support-service-lambdas',
			subscriptions: [
				{ orderActions: [orderAction], customFields: subscriptionCustomFields },
			],
			processingOptions: { runBilling: false, collectPayment: false },
		};
		const orderResponse: CreateSubscriptionResponse = await zuoraClient.post(
			'/v1/orders',
			JSON.stringify(orderRequest),
			createSubscriptionResponseSchema,
			headers,
		);
		const pmId = await getPaymentMethodId(orderResponse.accountNumber);
		await updateAccount(zuoraClient, orderResponse.accountNumber, {
			defaultPaymentMethodId: pmId,
			autoPay: true,
		});
		if (runBilling ?? true) {
			await generateBillingDocuments(
				zuoraClient,
				orderResponse.accountNumber,
				dayjs(),
			);
		}
		return orderResponse;
	};

	if (!existingPaymentMethod.requiresCloning) {
		// PM is unattached — create account without a PM then set it as default.
		return twoStep(() => Promise.resolve(existingPaymentMethod.id));
	}

	// requiresCloning: true — fetch the PM details and clone onto the new account.
	const pm = await getPaymentMethodById(zuoraClient, existingPaymentMethod.id);

	if (pm.type === 'CreditCard') {
		// Zuora only returns a masked card number (e.g. ****1234) for PCI-DSS
		// compliance — cannot be used to create a new payment method.
		throw new Error(
			`CreditCard payment method is not supported for cloning, ` +
				`only CreditCardReferenceTransaction, PayPal, or BankTransfer.`,
		);
	}

	if (pm.type === 'Bacs') {
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
		return twoStep((accountNumber) =>
			createBankTransferPaymentMethod(
				zuoraClient,
				accountNumber,
				bankTransferPm,
			),
		);
	}

	// CreditCardReferenceTransaction or PayPal — embed inline in the Orders API (one-step).
	let paymentMethodPayload: Record<string, unknown>;

	if (pm.type === 'CreditCardReferenceTransaction') {
		if (!pm.tokenId || !pm.secondTokenId) {
			throw new Error(
				`CreditCardReferenceTransaction payment method ${pm.id} is missing tokenId or secondTokenId`,
			);
		}
		paymentMethodPayload = {
			type: pm.type,
			tokenId: pm.tokenId,
			secondTokenId: pm.secondTokenId,
		};
	} else if (pm.type === 'PayPalNativeEC' || pm.type === 'PayPalCP') {
		if (!pm.BAID || !pm.email) {
			throw new Error(
				`PayPal payment method ${pm.id} is missing BAID or email`,
			);
		}
		paymentMethodPayload = { type: pm.type, BAID: pm.BAID, email: pm.email };
	} else {
		throw new Error(
			`Unsupported payment method type for cloning: ${pm.type}. ` +
				`Only CreditCardReferenceTransaction, PayPal, and BankTransfer are supported.`,
		);
	}

	const orderRequest = {
		newAccount: buildExistingPaymentMethodNewAccount(
			input,
			true,
			paymentMethodPayload,
		),
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
