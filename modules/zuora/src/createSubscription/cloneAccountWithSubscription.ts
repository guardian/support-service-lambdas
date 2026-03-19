import { CurrencyValues } from '@modules/internationalisation/currency';
import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import type { ProductPurchase } from '@modules/product-catalog/productPurchaseSchema';
import { productPurchaseSchema } from '@modules/product-catalog/productPurchaseSchema';
import type { AppliedPromotion, Promo } from '@modules/promotions/v2/schema';
import dayjs from 'dayjs';
import { z } from 'zod';
import { updateAccount } from '../account';
import { generateBillingDocuments } from '../invoice';
import { buildCreateSubscriptionOrderAction } from '../orders/orderActions';
import {
	createBankTransferPaymentMethod,
	getPaymentMethods,
} from '../paymentMethod';
import type { DefaultPaymentMethodResponse } from '../types';
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

function buildPaymentMethodPayload(
	paymentMethods: DefaultPaymentMethodResponse,
): Record<string, unknown> | undefined {
	const { defaultPaymentMethodId } = paymentMethods;

	const creditCard = paymentMethods.creditcard?.find(
		(pm) => pm.id === defaultPaymentMethodId,
	);
	if (creditCard) {
		return {
			type: creditCard.type,
			cardNumber: creditCard.cardNumber,
			expirationMonth: creditCard.expirationMonth,
			expirationYear: creditCard.expirationYear,
			creditCardType: creditCard.creditCardType,
			accountHolderInfo: creditCard.accountHolderInfo,
		};
	}

	// The tokenId/secondTokenId (Stripe payment method reference) is preserved and accepted
	// by the Orders API, so CCRT accounts can be cloned without any special handling.
	const creditCardReferenceTransaction =
		paymentMethods.creditcardreferencetransaction?.find(
			(pm) => pm.id === defaultPaymentMethodId,
		);
	if (creditCardReferenceTransaction) {
		return {
			type: creditCardReferenceTransaction.type,
			tokenId: creditCardReferenceTransaction.tokenId,
			secondTokenId: creditCardReferenceTransaction.secondTokenId,
		};
	}

	const paypal = paymentMethods.paypal?.find(
		(pm) => pm.id === defaultPaymentMethodId,
	);
	if (paypal) {
		return {
			type: paypal.type,
			BAID: paypal.BAID,
			email: paypal.email,
		};
	}

	return undefined;
}

// ---------- Source account schema ----------

// Zod strips unlisted fields by default, so system fields (id, accountId, createdDate, etc.)
// on contacts are automatically excluded — no manual stripping needed.
const sourceContactSchema = z.object({
	firstName: z.string(),
	lastName: z.string(),
	workEmail: z.string().nullish(),
	address1: z.string().nullish(),
	address2: z.string().nullish(),
	city: z.string().nullish(),
	country: z.string().nullish(),
	state: z.string().nullish(),
	zipCode: z.string().nullish(),
	SpecialDeliveryInstructions__c: z.string().nullish(),
});

const sourceBasicInfoSchema = z.object({
	id: z.string(),
	name: z.string(),
	crmId: z.string().nullish(),
	sfContactId__c: z.string().nullish(),
	IdentityId__c: z.string().nullish(),
	batch: z.string().nullish(),
	notes: z.string().nullish(),
	salesRep: z.string().nullish(),
});

const sourceBillingAndPaymentSchema = z.object({
	currency: z.enum(CurrencyValues),
	paymentGateway: z.string().nullish(),
	autoPay: z.boolean().nullish(),
});

const sourceAccountSchema = z.object({
	basicInfo: sourceBasicInfoSchema,
	billingAndPayment: sourceBillingAndPaymentSchema,
	billToContact: sourceContactSchema,
	soldToContact: sourceContactSchema.optional(),
});

type SourceAccount = z.infer<typeof sourceAccountSchema>;

// Maps a contact fetched from GET /v1/accounts to the format expected by the Orders API.
// GET returns zipCode; Orders API expects postalCode.
function toOrdersApiContact(
	contact: z.infer<typeof sourceContactSchema>,
): Record<string, unknown> {
	const { zipCode, ...rest } = contact;
	return {
		...rest,
		postalCode: zipCode ?? undefined,
	};
}

// ---------- Input type ----------

// DistributiveOmit removes deliveryContact and deliveryInstructions from delivery product
// variants of ProductPurchase — those fields are sourced from the existing account, not
// provided by the caller.
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
	? Omit<T, K>
	: never;

export type CloneAccountProductPurchase = DistributiveOmit<
	ProductPurchase,
	'deliveryContact' | 'deliveryInstructions'
>;

export type CloneAccountWithSubscriptionInput = {
	sourceAccountNumber: string;
	productPurchase: CloneAccountProductPurchase;
	createdRequestId?: string;
	appliedPromotion?: AppliedPromotion;
	runBilling?: boolean;
	collectPayment?: boolean;
};

// ---------- Main function ----------

/**
 * Creates a new Zuora account (cloned from an existing one) together with a new subscription,
 * in a single Orders API request.
 *
 * Account details (contacts, billing info, payment method, Salesforce/identity IDs) are copied
 * from the source account. For delivery products, deliveryContact and deliveryInstructions are
 * taken from the source account's soldToContact; the caller only needs to supply firstDeliveryDate
 * (and deliveryAgent for NationalDelivery).
 *
 * Note: BankTransfer (GoCardless) uses a two-step flow — account is created without
 * a payment method, then the mandate is attached via POST /v1/payment-methods and set
 * as the default. Billing is triggered separately via billing-documents/generate.
 */
export const cloneAccountWithSubscription = async (
	zuoraClient: ZuoraClient,
	productCatalog: ProductCatalog,
	{
		sourceAccountNumber,
		productPurchase,
		createdRequestId,
		appliedPromotion,
		runBilling,
		collectPayment,
	}: CloneAccountWithSubscriptionInput,
	promotion: Promo | undefined,
): Promise<CreateSubscriptionResponse> => {
	const sourceAccount: SourceAccount = await zuoraClient.get(
		`v1/accounts/${sourceAccountNumber}`,
		sourceAccountSchema,
	);

	const paymentMethods = await getPaymentMethods(
		zuoraClient,
		sourceAccount.basicInfo.id,
	);

	const { defaultPaymentMethodId } = paymentMethods;
	// Bank Transfer payment methods need to be handled differently from tokenised payment methods (credit card and paypal)
	const paymentMethodIsBankTransfer = paymentMethods.banktransfer?.find(
		(pm) => pm.id === defaultPaymentMethodId,
	);
	const paymentMethodPayload = paymentMethodIsBankTransfer
		? undefined
		: buildPaymentMethodPayload(paymentMethods);

	if (!paymentMethodIsBankTransfer && !paymentMethodPayload) {
		throw new Error(
			`Could not find default payment method ${paymentMethods.defaultPaymentMethodId} for account ${sourceAccountNumber}`,
		);
	}

	if (!sourceAccount.billingAndPayment.paymentGateway) {
		throw new Error(
			`No payment gateway found for account ${sourceAccountNumber}`,
		);
	}

	// Delivery contact and instructions come from the source account's soldToContact.
	// We reconstruct a full ProductPurchase via the schema so that helpers that accept
	// ProductPurchase work without type assertions. For non-delivery products, the extra
	// delivery fields are stripped by the discriminated union schema.
	const soldToForPurchase = sourceAccount.soldToContact
		? {
				firstName: sourceAccount.soldToContact.firstName,
				lastName: sourceAccount.soldToContact.lastName,
				workEmail: sourceAccount.soldToContact.workEmail ?? '',
				country: sourceAccount.soldToContact.country ?? '',
				state: sourceAccount.soldToContact.state,
				city: sourceAccount.soldToContact.city ?? '',
				address1: sourceAccount.soldToContact.address1 ?? '',
				address2: sourceAccount.soldToContact.address2,
				postalCode: sourceAccount.soldToContact.zipCode ?? '',
			}
		: undefined;

	const fullProductPurchase: ProductPurchase = productPurchaseSchema.parse({
		...productPurchase,
		...(soldToForPurchase
			? {
					deliveryContact: soldToForPurchase,
					deliveryInstructions:
						sourceAccount.soldToContact?.SpecialDeliveryInstructions__c ?? '',
				}
			: {}),
	});

	const { contractEffectiveDate, customerAcceptanceDate } =
		getSubscriptionDates(dayjs(), fullProductPurchase);

	const chargeOverride = getChargeOverride(
		productCatalog,
		fullProductPurchase,
		sourceAccount.billingAndPayment.currency,
	);

	const productRatePlan = getProductRatePlan(
		productCatalog,
		fullProductPurchase,
	);

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

	const deliveryAgent =
		'deliveryAgent' in productPurchase
			? String(productPurchase.deliveryAgent)
			: '';

	const subscriptionCustomFields = {
		DeliveryAgent__c: deliveryAgent,
		ReaderType__c: appliedPromotion?.promoCode.endsWith('PATRON')
			? ReaderType.Patron
			: ReaderType.Direct,
		LastPlanAddedDate__c: zuoraDateFormat(contractEffectiveDate),
		InitialPromotionCode__c: appliedPromotion?.promoCode,
		PromotionCode__c: appliedPromotion?.promoCode,
		CreatedRequestId__c: createdRequestId,
	};

	const newAccount = {
		name: sourceAccount.basicInfo.name,
		currency: sourceAccount.billingAndPayment.currency,
		crmId: sourceAccount.basicInfo.crmId ?? '',
		customFields: {
			sfContactId__c: sourceAccount.basicInfo.sfContactId__c ?? '',
			IdentityId__c: sourceAccount.basicInfo.IdentityId__c ?? '',
			CreatedRequestId__c: createdRequestId ?? '',
		},
		billCycleDay: 0,
		autoPay: paymentMethodIsBankTransfer
			? false
			: (sourceAccount.billingAndPayment.autoPay ?? true),
		paymentGateway: sourceAccount.billingAndPayment.paymentGateway,
		paymentMethod: paymentMethodPayload,
		billToContact: toOrdersApiContact(sourceAccount.billToContact),
		soldToContact: sourceAccount.soldToContact
			? toOrdersApiContact(sourceAccount.soldToContact)
			: undefined,
	};

	const orderRequest = {
		newAccount,
		orderDate: zuoraDateFormat(contractEffectiveDate),
		description:
			'Created by cloneAccountWithSubscription.ts in support-service-lambdas',
		subscriptions: [
			{
				orderActions: [createSubscriptionOrderAction],
				customFields: subscriptionCustomFields,
			},
		],
		processingOptions: {
			runBilling: paymentMethodIsBankTransfer ? false : (runBilling ?? true),
			collectPayment: paymentMethodIsBankTransfer
				? false
				: (collectPayment ?? true),
		},
	};

	// Post directly rather than via executeOrderRequest to avoid the generic NewAccount<T>
	// type constraint — account/payment data is sourced at runtime from the source account.
	const headers = createdRequestId
		? { 'idempotency-key': createdRequestId }
		: undefined;
	const orderResponse: CreateSubscriptionResponse = await zuoraClient.post(
		'/v1/orders',
		JSON.stringify(orderRequest),
		createSubscriptionResponseSchema,
		headers,
	);

	if (paymentMethodIsBankTransfer) {
		// Two-step approach for GoCardless: account is created without a payment
		// method, then the payment method is attached separately. This avoids the
		// Orders API creating a new GoCardless customer (which would break mandate
		// lookup), and instead relies on POST /v1/payment-methods to associate the
		// existing mandate with the new account.
		const newPaymentMethodId = await createBankTransferPaymentMethod(
			zuoraClient,
			orderResponse.accountNumber,
			paymentMethodIsBankTransfer,
		);
		await updateAccount(zuoraClient, orderResponse.accountNumber, {
			defaultPaymentMethodId: newPaymentMethodId,
			autoPay: sourceAccount.billingAndPayment.autoPay ?? true,
		});
		if (runBilling ?? true) {
			// autoPost:true posts the invoice immediately and submits the GoCardless
			// payment request. GoCardless / BACS settlement is asynchronous (3+ days),
			// but the collection instruction is sent synchronously.
			await generateBillingDocuments(
				zuoraClient,
				orderResponse.accountNumber,
				dayjs(),
			);
		}
	}

	return orderResponse;
};
