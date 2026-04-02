/**
 *
 * @group integration
 */

import { SupportRegionId } from '@modules/internationalisation/countryGroup';
import { CurrencyValues } from '@modules/internationalisation/currency';
import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import { getPromotion } from '@modules/promotions/v2/getPromotion';
import { zuoraCatalogSchema } from '@modules/zuora-catalog/zuoraCatalogSchema';
import { z } from 'zod';
import { deleteAccount } from '@modules/zuora/account';
import { createSubscriptionWithExistingPaymentMethod } from '@modules/zuora/createSubscription/createSubscriptionWithExistingPaymentMethod';
import type {
	PaymentGateway,
	PaymentMethod,
} from '@modules/zuora/orders/paymentMethods';
import { getPaymentMethods } from '@modules/zuora/paymentMethod';
import { getSubscription } from '@modules/zuora/subscription';
import { zuoraSubscriptionSchema } from '@modules/zuora/types/objects/subscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import code from '../../zuora-catalog/test/fixtures/catalog-code.json';

// Minimal schema to read only the fields we need to reproduce account details on a new account.
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
});

const sourceAccountSchema = z.object({
	basicInfo: z.object({
		name: z.string(),
		crmId: z.string().nullish(),
		sfContactId__c: z.string().nullish(),
		IdentityId__c: z.string().nullish(),
	}),
	billingAndPayment: z.object({
		currency: z.enum(CurrencyValues),
		paymentGateway: z.string(),
	}),
	billToContact: sourceContactSchema,
	soldToContact: sourceContactSchema.optional(),
});

describe('createSubscriptionWithExistingPaymentMethod integration', () => {
	const productCatalog = generateProductCatalog(zuoraCatalogSchema.parse(code));
	let zuoraClient: ZuoraClient;

	beforeAll(async () => {
		zuoraClient = await ZuoraClient.create('CODE');
	});

	test('creates a GuardianAdLite subscription using an existing CreditCardReferenceTransaction payment method', async () => {
		const sourceAccountNumber = '2c92c0f87568d97201756b1578960694';
		const requestId = `IT-createSubExistingPM-CCRT-${sourceAccountNumber.slice(-8)}-${Date.now()}`;

		const sourceAccount: z.infer<typeof sourceAccountSchema> =
			await zuoraClient.get(
				`v1/accounts/${sourceAccountNumber}`,
				sourceAccountSchema,
			);
		const paymentMethods = await getPaymentMethods(
			zuoraClient,
			sourceAccountNumber,
		);

		const response = await createSubscriptionWithExistingPaymentMethod(
			zuoraClient,
			productCatalog,
			{
				accountName: sourceAccount.basicInfo.name,
				createdRequestId: requestId,
				salesforceAccountId: sourceAccount.basicInfo.crmId ?? '',
				salesforceContactId: sourceAccount.basicInfo.sfContactId__c ?? '',
				identityId: sourceAccount.basicInfo.IdentityId__c ?? '',
				currency: sourceAccount.billingAndPayment.currency,
				paymentGateway: sourceAccount.billingAndPayment
					.paymentGateway as PaymentGateway<PaymentMethod>,
				existingPaymentMethod: {
					id: paymentMethods.defaultPaymentMethodId,
					requiresCloning: true,
				},
				billToContact: {
					firstName: sourceAccount.billToContact.firstName,
					lastName: sourceAccount.billToContact.lastName,
					workEmail: sourceAccount.billToContact.workEmail ?? '',
					country: sourceAccount.billToContact.country ?? '',
					state: sourceAccount.billToContact.state,
				},
				productPurchase: { product: 'GuardianAdLite', ratePlan: 'Monthly' },
				runBilling: true,
				collectPayment: true,
			},
			undefined,
		);

		expect(response.accountNumber).toMatch(/^A\d+$/);
		expect(response.subscriptionNumbers.length).toBe(1);

		//await deleteAccount(zuoraClient, response.accountNumber);
	}, 120000);

	test('throws for an existing PayPal payment method because tokens cannot be reliably retrieved', async () => {
		const sourceAccountNumber = '2c92c0f875d488d70175d6a29ead032c';
		const requestId = `IT-createSubExistingPM-PayPal-${sourceAccountNumber.slice(-8)}-${Date.now()}`;

		const sourceAccount: z.infer<typeof sourceAccountSchema> =
			await zuoraClient.get(
				`v1/accounts/${sourceAccountNumber}`,
				sourceAccountSchema,
			);
		const paymentMethods = await getPaymentMethods(
			zuoraClient,
			sourceAccountNumber,
		);

		await expect(
			createSubscriptionWithExistingPaymentMethod(
				zuoraClient,
				productCatalog,
				{
					accountName: sourceAccount.basicInfo.name,
					createdRequestId: requestId,
					salesforceAccountId: sourceAccount.basicInfo.crmId ?? '',
					salesforceContactId: sourceAccount.basicInfo.sfContactId__c ?? '',
					identityId: sourceAccount.basicInfo.IdentityId__c ?? '',
					currency: sourceAccount.billingAndPayment.currency,
					paymentGateway: sourceAccount.billingAndPayment
						.paymentGateway as PaymentGateway<PaymentMethod>,
					existingPaymentMethod: {
						id: paymentMethods.defaultPaymentMethodId,
						requiresCloning: true,
					},
					billToContact: {
						firstName: sourceAccount.billToContact.firstName,
						lastName: sourceAccount.billToContact.lastName,
						workEmail: sourceAccount.billToContact.workEmail ?? '',
						country: sourceAccount.billToContact.country ?? '',
						state: sourceAccount.billToContact.state,
					},
					productPurchase: {
						product: 'DigitalSubscription',
						ratePlan: 'Monthly',
					},
					runBilling: false,
					collectPayment: false,
				},
				undefined,
			),
		).rejects.toThrow('payment method is not supported for cloning');
	}, 120000);

	test('creates a SupporterPlus subscription using an existing BankTransfer (GoCardless) payment method', async () => {
		const sourceAccountNumber = '2c92c0f8757974d3017594cbffa00536';
		const requestId = `IT-createSubExistingPM-BankTransfer-${Date.now()}`;

		const sourceAccount: z.infer<typeof sourceAccountSchema> =
			await zuoraClient.get(
				`v1/accounts/${sourceAccountNumber}`,
				sourceAccountSchema,
			);
		const paymentMethods = await getPaymentMethods(
			zuoraClient,
			sourceAccountNumber,
		);

		const response = await createSubscriptionWithExistingPaymentMethod(
			zuoraClient,
			productCatalog,
			{
				accountName: sourceAccount.basicInfo.name,
				createdRequestId: requestId,
				salesforceAccountId: sourceAccount.basicInfo.crmId ?? '',
				salesforceContactId: sourceAccount.basicInfo.sfContactId__c ?? '',
				identityId: sourceAccount.basicInfo.IdentityId__c ?? '',
				currency: sourceAccount.billingAndPayment.currency,
				paymentGateway: sourceAccount.billingAndPayment
					.paymentGateway as PaymentGateway<PaymentMethod>,
				existingPaymentMethod: {
					id: paymentMethods.defaultPaymentMethodId,
					requiresCloning: true,
				},
				billToContact: {
					firstName: sourceAccount.billToContact.firstName,
					lastName: sourceAccount.billToContact.lastName,
					workEmail: sourceAccount.billToContact.workEmail ?? '',
					country: sourceAccount.billToContact.country ?? '',
					state: sourceAccount.billToContact.state,
				},
				productPurchase: {
					product: 'SupporterPlus',
					ratePlan: 'Monthly',
					amount: 12,
				},
				runBilling: true,
				collectPayment: true,
			},
			undefined,
		);

		expect(response.accountNumber).toMatch(/^A\d+$/);
		expect(response.subscriptionNumbers.length).toBe(1);

		//await deleteAccount(zuoraClient, response.accountNumber);
	}, 120000);

	test('applies a promo code to the new subscription', async () => {
		const sourceAccountNumber = '2c92c0f87568d97201756b1578960694';
		const promoCode = 'E2E_TEST_SPLUS_MONTHLY';
		const promotion = await getPromotion(promoCode, 'CODE');
		const requestId = `IT-createSubExistingPM-promo-${sourceAccountNumber.slice(-8)}-${Date.now()}`;

		const sourceAccount: z.infer<typeof sourceAccountSchema> =
			await zuoraClient.get(
				`v1/accounts/${sourceAccountNumber}`,
				sourceAccountSchema,
			);
		const paymentMethods = await getPaymentMethods(
			zuoraClient,
			sourceAccountNumber,
		);

		const response = await createSubscriptionWithExistingPaymentMethod(
			zuoraClient,
			productCatalog,
			{
				accountName: sourceAccount.basicInfo.name,
				createdRequestId: requestId,
				salesforceAccountId: sourceAccount.basicInfo.crmId ?? '',
				salesforceContactId: sourceAccount.basicInfo.sfContactId__c ?? '',
				identityId: sourceAccount.basicInfo.IdentityId__c ?? '',
				currency: sourceAccount.billingAndPayment.currency,
				paymentGateway: sourceAccount.billingAndPayment
					.paymentGateway as PaymentGateway<PaymentMethod>,
				existingPaymentMethod: {
					id: paymentMethods.defaultPaymentMethodId,
					requiresCloning: true,
				},
				billToContact: {
					firstName: sourceAccount.billToContact.firstName,
					lastName: sourceAccount.billToContact.lastName,
					workEmail: sourceAccount.billToContact.workEmail ?? '',
					country: sourceAccount.billToContact.country ?? '',
					state: sourceAccount.billToContact.state,
				},
				productPurchase: {
					product: 'SupporterPlus',
					ratePlan: 'Monthly',
					amount: 12,
				},
				appliedPromotion: {
					promoCode,
					supportRegionId: SupportRegionId.UK,
				},
				runBilling: false,
				collectPayment: false,
			},
			promotion,
		);

		expect(response.subscriptionNumbers.length).toBe(1);

		const subscriptionWithPromotionSchema = zuoraSubscriptionSchema.extend({
			InitialPromotionCode__c: z.string().nullable(),
			PromotionCode__c: z.string().nullable(),
		});
		const subscription = await getSubscription(
			zuoraClient,
			response.subscriptionNumbers[0]!,
			subscriptionWithPromotionSchema,
		);

		expect(subscription.ratePlans.length).toEqual(2); // product rate plan + discount rate plan
		expect(subscription.InitialPromotionCode__c).toEqual(promoCode);
		expect(subscription.PromotionCode__c).toEqual(promoCode);

		await deleteAccount(zuoraClient, response.accountNumber);
	}, 120000);
});
