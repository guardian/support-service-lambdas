import type { IsoCurrency } from '@modules/internationalisation/currency';
import { getIfDefined } from '@modules/nullAndUndefined';
import type {
	ProductCatalog,
	ProductKey,
} from '@modules/product-catalog/productCatalog';
import type { ProductPurchase } from '@modules/product-catalog/productPurchaseSchema';
import { getDiscountRatePlanFromCatalog } from '@modules/promotions/v2/getPromotion';
import type { AppliedPromotion, Promo } from '@modules/promotions/v2/schema';
import type { ValidatedPromotion } from '@modules/promotions/v2/validatePromotion';
import { validatePromotion } from '@modules/promotions/v2/validatePromotion';
import dayjs from 'dayjs';
import { z } from 'zod';
import { updateAccount } from '@modules/zuora/account';
import { getChargeOverride } from '@modules/zuora/createSubscription/chargeOverride';
import { getProductRatePlan } from '@modules/zuora/createSubscription/getProductRatePlan';
import type { GiftRecipient } from '@modules/zuora/createSubscription/giftRecipient';
import { ReaderType } from '@modules/zuora/createSubscription/readerType';
import { getSubscriptionDates } from '@modules/zuora/createSubscription/subscriptionDates';
import { generateBillingDocuments } from '@modules/zuora/invoice';
import type { Contact } from '@modules/zuora/orders/newAccount';
import { buildNewAccountObject } from '@modules/zuora/orders/newAccount';
import { buildCreateSubscriptionOrderAction } from '@modules/zuora/orders/orderActions';
import type { CreateOrderRequest } from '@modules/zuora/orders/orderRequests';
import { executeOrderRequest } from '@modules/zuora/orders/orderRequests';
import type {
	ExistingPaymentMethod,
	PaymentGateway,
	PaymentMethod,
} from '@modules/zuora/orders/paymentMethods';
import {
	type BankTransferCloneInput,
	createBankTransferPaymentMethod,
	getPaymentMethodById,
} from '@modules/zuora/paymentMethod';
import { zuoraDateFormat } from '@modules/zuora/utils';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';

export const createSubscriptionResponseSchema = z.object({
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
	appliedPromotion?: AppliedPromotion;
	runBilling?: boolean;
	collectPayment?: boolean;
	acquisitionCase?: string;
	acquisitionSource?: string;
	createdByCSR?: string;
};

export type PromotionInputFields = {
	validatedPromotion: ValidatedPromotion;
	discountProductRatePlanId: string;
	discountProductRatePlanChargeId: string;
};

export type CreateSubscriptionWithExistingPaymentMethodInput = Omit<
	CreateSubscriptionInputFields<PaymentMethod>,
	'paymentGateway' | 'paymentMethod' | 'giftRecipient'
> & {
	// Less strongly typed than PaymentGateway<T> — the PM type is not known at
	// compile time when using an existing payment method ID.
	paymentGateway: string;
	existingPaymentMethod: ExistingPaymentMethod;
};

export function getPromotionInputFields(
	appliedPromotion: AppliedPromotion | undefined,
	promotion: Promo | undefined,
	productRatePlanId: string,
	productCatalog: ProductCatalog,
	productKey: ProductKey,
): PromotionInputFields | undefined {
	const validatedPromotion = appliedPromotion
		? validatePromotion(promotion, appliedPromotion, productRatePlanId)
		: undefined;

	if (!validatedPromotion) {
		console.log('No promotion applied');
		return;
	}
	console.log(`Validated promotion is `, validatedPromotion);

	const promotionProductRatePlan = getIfDefined(
		getDiscountRatePlanFromCatalog(productCatalog, productKey),
		'No promotion rate plan found in product catalog for product ' + productKey,
	);
	return {
		validatedPromotion,
		discountProductRatePlanId: promotionProductRatePlan.id,
		discountProductRatePlanChargeId:
			promotionProductRatePlan.charges.Percentage.id,
	};
}

// Shared pipeline: computes dates, charge override, product rate plan, promotions,
// and the subscription order action. Used by both createSubscription and
// createSubscriptionWithExistingPaymentMethod.
function buildSubscriptionOrderAction(
	productCatalog: ProductCatalog,
	productPurchase: ProductPurchase,
	currency: IsoCurrency,
	appliedPromotion: AppliedPromotion | undefined,
	promotion: Promo | undefined,
) {
	const { contractEffectiveDate, customerAcceptanceDate } =
		getSubscriptionDates(dayjs(), productPurchase);
	const chargeOverride = getChargeOverride(
		productCatalog,
		productPurchase,
		currency,
	);
	const productRatePlan = getProductRatePlan(productCatalog, productPurchase);
	const promotionInputFields = getPromotionInputFields(
		appliedPromotion,
		promotion,
		productRatePlan.id,
		productCatalog,
		productPurchase.product,
	);
	const orderAction = buildCreateSubscriptionOrderAction({
		productRatePlanId: productRatePlan.id,
		contractEffectiveDate,
		customerAcceptanceDate,
		chargeOverride,
		promotionInputFields,
		termType: productRatePlan.termType,
		termLengthInMonths: productRatePlan.termLengthInMonths,
	});
	return { contractEffectiveDate, customerAcceptanceDate, orderAction };
}

// Builds the new account object for the existing-payment-method path.
// autoPay and paymentMethod differ per case; all other fields are constant.
function buildExistingPmNewAccount(
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

export function buildCreateSubscriptionRequest<T extends PaymentMethod>(
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
		appliedPromotion,
		runBilling,
		collectPayment,
	}: CreateSubscriptionInputFields<T>,
	promotion: Promo | undefined,
): CreateOrderRequest {
	const { deliveryContact, deliveryAgent, deliveryInstructions } = {
		deliveryContact: undefined,
		deliveryAgent: '',
		deliveryInstructions: undefined,
		...productPurchase,
	};

	const newAccount = buildNewAccountObject({
		accountName,
		createdRequestId,
		salesforceAccountId,
		salesforceContactId,
		identityId,
		currency,
		paymentGateway,
		paymentMethod,
		billToContact,
		soldToContact: deliveryContact,
		deliveryInstructions,
	});

	const { contractEffectiveDate, orderAction } = buildSubscriptionOrderAction(
		productCatalog,
		productPurchase,
		currency,
		appliedPromotion,
		promotion,
	);

	const readerType = giftRecipient
		? ReaderType.Gift
		: appliedPromotion?.promoCode.endsWith('PATRON')
			? ReaderType.Patron
			: ReaderType.Direct;

	const customFields = {
		DeliveryAgent__c: deliveryAgent.toString(),
		ReaderType__c: readerType,
		LastPlanAddedDate__c: zuoraDateFormat(contractEffectiveDate),
		InitialPromotionCode__c: appliedPromotion?.promoCode,
		PromotionCode__c: appliedPromotion?.promoCode,
		CreatedRequestId__c: createdRequestId,
	};
	return {
		newAccount,
		orderDate: zuoraDateFormat(contractEffectiveDate),
		description: `Created by createSubscription.ts in support-service-lambdas`,
		subscriptions: [
			{
				orderActions: [orderAction],
				customFields,
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
	promotion: Promo | undefined,
): Promise<CreateSubscriptionResponse> => {
	return executeOrderRequest(
		zuoraClient,
		buildCreateSubscriptionRequest(productCatalog, inputFields, promotion),
		createSubscriptionResponseSchema,
		inputFields.createdRequestId,
	);
};

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
	} = input;

	const { contractEffectiveDate, orderAction } = buildSubscriptionOrderAction(
		productCatalog,
		input.productPurchase,
		input.currency,
		appliedPromotion,
		promotion,
	);

	const subscriptionCustomFields = {
		ReaderType__c: appliedPromotion?.promoCode.endsWith('PATRON')
			? ReaderType.Patron
			: ReaderType.Direct,
		LastPlanAddedDate__c: zuoraDateFormat(contractEffectiveDate),
		InitialPromotionCode__c: appliedPromotion?.promoCode,
		PromotionCode__c: appliedPromotion?.promoCode,
		CreatedRequestId__c: createdRequestId,
		AcquisitionCase__c: acquisitionCase,
		AcquisitionSource__c: acquisitionSource,
		CreatedByCSR__c: createdByCSR,
	};

	const headers = createdRequestId
		? { 'idempotency-key': createdRequestId }
		: undefined;

	// Two-step flow: create account without PM, then attach the payment method.
	// getPaymentMethodId receives the newly created account number and returns the PM ID to attach.
	const twoStep = async (
		getPaymentMethodId: (accountNumber: string) => Promise<string>,
	): Promise<CreateSubscriptionResponse> => {
		const orderRequest = {
			newAccount: buildExistingPmNewAccount(input, false),
			orderDate: zuoraDateFormat(contractEffectiveDate),
			description: 'Created by createSubscription.ts in support-service-lambdas',
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
			createBankTransferPaymentMethod(zuoraClient, accountNumber, bankTransferPm),
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
		newAccount: buildExistingPmNewAccount(input, true, paymentMethodPayload),
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
