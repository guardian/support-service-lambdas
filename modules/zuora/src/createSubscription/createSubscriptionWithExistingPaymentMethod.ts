import type { IsoCurrency } from '@modules/internationalisation/currency';
import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import type { ProductPurchase } from '@modules/product-catalog/productPurchaseSchema';
import type { AppliedPromotion, Promo } from '@modules/promotions/v2/schema';
import dayjs from 'dayjs';
import { updateAccount } from '../account';
import { generateBillingDocuments } from '../invoice';
import type { Contact } from '../orders/newAccount';
import { buildCreateSubscriptionOrderAction } from '../orders/orderActions';
import type { ExistingPaymentMethod } from '../orders/paymentMethods';
import {
	type BankTransferCloneInput,
	createBankTransferPaymentMethod,
	getPaymentMethodById,
} from '../paymentMethod';
import { zuoraDateFormat } from '../utils';
import type { ZuoraClient } from '../zuoraClient';
import { getChargeOverride } from './chargeOverride';
import {
	type CreateSubscriptionResponse,
	createSubscriptionResponseSchema,
	getPromotionInputFields,
} from './createSubscription';
import { getProductRatePlan } from './getProductRatePlan';
import { ReaderType } from './readerType';
import { getSubscriptionDates } from './subscriptionDates';

export type CreateSubscriptionWithExistingPaymentMethodInput = {
	accountName: string;
	createdRequestId?: string;
	salesforceAccountId: string;
	salesforceContactId: string;
	identityId: string;
	currency: IsoCurrency;
	// Less strongly typed than PaymentGateway<T> — the PM type is not known at
	// compile time when using an existing payment method ID.
	paymentGateway: string;
	existingPaymentMethod: ExistingPaymentMethod;
	billToContact: Contact;
	soldToContact?: Contact;
	productPurchase: ProductPurchase;
	appliedPromotion?: AppliedPromotion;
	runBilling?: boolean;
	collectPayment?: boolean;
	acquisitionCase?: string;
	acquisitionSource?: string;
	createdByCSR?: string;
};

// Creates a new Zuora account and subscription using a pre-existing Zuora payment method ID.
//
// Two modes depending on existingPaymentMethod.requiresCloning:
//   false — the PM is not yet attached to any account; the account is created without a PM
//           and the PM is set as default via updateAccount.
//   true  — the PM lives on another account and must be cloned (re-created via the
//           appropriate Zuora API) before being attached to the new account. Uses the same
//           clone patterns as cloneAccountWithSubscription.ts.
export const createSubscriptionWithExistingPaymentMethod = async (
	zuoraClient: ZuoraClient,
	productCatalog: ProductCatalog,
	{
		accountName,
		createdRequestId,
		salesforceAccountId,
		salesforceContactId,
		identityId,
		currency,
		paymentGateway,
		existingPaymentMethod,
		billToContact,
		soldToContact,
		productPurchase,
		appliedPromotion,
		runBilling,
		collectPayment,
		acquisitionCase,
		acquisitionSource,
		createdByCSR,
	}: CreateSubscriptionWithExistingPaymentMethodInput,
	promotion: Promo | undefined,
): Promise<CreateSubscriptionResponse> => {
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

	const createSubscriptionOrderAction = buildCreateSubscriptionOrderAction({
		productRatePlanId: productRatePlan.id,
		contractEffectiveDate,
		customerAcceptanceDate,
		chargeOverride,
		promotionInputFields,
		termType: productRatePlan.termType,
		termLengthInMonths: productRatePlan.termLengthInMonths,
	});

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

	if (!existingPaymentMethod.requiresCloning) {
		// PM is unattached — create account without a PM then attach it.
		const newAccount = {
			name: accountName,
			currency,
			crmId: salesforceAccountId,
			customFields: {
				sfContactId__c: salesforceContactId,
				IdentityId__c: identityId,
				CreatedRequestId__c: createdRequestId ?? '',
			},
			billCycleDay: 0 as const,
			autoPay: false,
			paymentGateway,
			billToContact,
			soldToContact,
		};

		const orderRequest = {
			newAccount,
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
				runBilling: false,
				collectPayment: false,
			},
		};

		const orderResponse: CreateSubscriptionResponse = await zuoraClient.post(
			'/v1/orders',
			JSON.stringify(orderRequest),
			createSubscriptionResponseSchema,
			headers,
		);

		await updateAccount(zuoraClient, orderResponse.accountNumber, {
			defaultPaymentMethodId: existingPaymentMethod.id,
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
		// BankTransfer uses the same two-step clone flow as cloneAccountWithSubscription:
		// create account without PM, POST /v1/payment-methods to clone it, then updateAccount.
		const newAccount = {
			name: accountName,
			currency,
			crmId: salesforceAccountId,
			customFields: {
				sfContactId__c: salesforceContactId,
				IdentityId__c: identityId,
				CreatedRequestId__c: createdRequestId ?? '',
			},
			billCycleDay: 0 as const,
			autoPay: false,
			paymentGateway,
			billToContact,
			soldToContact,
		};

		const orderRequest = {
			newAccount,
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
				runBilling: false,
				collectPayment: false,
			},
		};

		const orderResponse: CreateSubscriptionResponse = await zuoraClient.post(
			'/v1/orders',
			JSON.stringify(orderRequest),
			createSubscriptionResponseSchema,
			headers,
		);

		// Cast to BankTransferCloneInput — createBankTransferPaymentMethod only reads
		// the fields below; the remaining fields from the full schema are not used.
		const bankTransferPm: BankTransferCloneInput = {
			type: pm.type,
			accountNumber: pm.accountNumber ?? '',
			bankCode: pm.bankCode ?? '',
			accountHolderInfo: {
				accountHolderName:
					pm.accountHolderInfo?.accountHolderName ?? null,
			},
			mandateInfo: {
				mandateId: pm.mandateInfo?.mandateId ?? null,
				mandateReason: pm.mandateInfo?.mandateReason ?? null,
				mandateStatus: pm.mandateInfo?.mandateStatus ?? null,
			},
		};

		const newPaymentMethodId = await createBankTransferPaymentMethod(
			zuoraClient,
			orderResponse.accountNumber,
			bankTransferPm,
		);
		await updateAccount(zuoraClient, orderResponse.accountNumber, {
			defaultPaymentMethodId: newPaymentMethodId,
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
	}

	// CreditCardReferenceTransaction or PayPal — can be embedded inline in the Orders API.
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
		paymentMethodPayload = {
			type: pm.type,
			BAID: pm.BAID,
			email: pm.email,
		};
	} else {
		throw new Error(
			`Unsupported payment method type for cloning: ${pm.type}. ` +
				`Only CreditCardReferenceTransaction, PayPal, and BankTransfer are supported.`,
		);
	}

	const newAccount = {
		name: accountName,
		currency,
		crmId: salesforceAccountId,
		customFields: {
			sfContactId__c: salesforceContactId,
			IdentityId__c: identityId,
			CreatedRequestId__c: createdRequestId ?? '',
		},
		billCycleDay: 0 as const,
		autoPay: true,
		paymentGateway,
		paymentMethod: paymentMethodPayload,
		billToContact,
		soldToContact,
	};

	const orderRequest = {
		newAccount,
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

	return zuoraClient.post(
		'/v1/orders',
		JSON.stringify(orderRequest),
		createSubscriptionResponseSchema,
		headers,
	);
};
