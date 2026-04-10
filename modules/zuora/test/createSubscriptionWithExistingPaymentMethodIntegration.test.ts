/**
 *
 * @group integration
 */

import { SupportRegionId } from '@modules/internationalisation/countryGroup';
import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import { getPromotion } from '@modules/promotions/v2/getPromotion';
import { zuoraCatalogSchema } from '@modules/zuora-catalog/zuoraCatalogSchema';
import dayjs from 'dayjs';
import { z } from 'zod';
import { deleteAccount } from '@modules/zuora/account';
import type { CreateSubscriptionWithExistingPaymentMethodInput } from '@modules/zuora/createSubscription/createSubscriptionWithExistingPaymentMethod';
import { createSubscriptionWithExistingPaymentMethod } from '@modules/zuora/createSubscription/createSubscriptionWithExistingPaymentMethod';
import type {
	PaymentGateway,
	PaymentMethod,
} from '@modules/zuora/orders/paymentMethods';
import { getSubscription } from '@modules/zuora/subscription';
import { zuoraSubscriptionSchema } from '@modules/zuora/types/objects/subscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import code from '../../zuora-catalog/test/fixtures/catalog-code.json';

describe('createSubscriptionWithExistingPaymentMethod integration', () => {
	const productCatalog = generateProductCatalog(zuoraCatalogSchema.parse(code));
	let zuoraClient: ZuoraClient;

	const commonFields = {
		acquisitionCase: '1234',
		acquisitionSource: 'CSR',
		createdByCSR: 'John Smith',
		runBilling: true,
		collectPayment: true,
	};

	const ukBillToContact = {
		firstName: 'TestFirstName',
		lastName: 'TestLastName',
		workEmail: 'test@thegulocal.com',
		country: 'United Kingdom',
		state: undefined,
	};

	beforeAll(async () => {
		zuoraClient = await ZuoraClient.create('CODE');
	});

	test('creates a GuardianAdLite subscription using an existing CreditCardReferenceTransaction payment method', async () => {
		const sourceAccountNumber = 'A00078074';
		const sourceAccountInput: CreateSubscriptionWithExistingPaymentMethodInput =
			{
				...commonFields,
				accountName: '0013E00001AU6xcQAD',
				createdRequestId: `IT-createSubExistingPM-CCRT-${sourceAccountNumber}-${Date.now()}`,
				salesforceAccountId: '0013E00001AU6xcQAD',
				salesforceContactId: '0033E00001Cq8D2QAJ',
				identityId: '9999999',
				currency: 'GBP',
				paymentGateway: 'Stripe Gateway 1' as PaymentGateway<PaymentMethod>,
				existingPaymentMethod: {
					id: '2c92c0f87568d97201756b1578b6069c',
					requiresCloning: true,
				},
				billToContact: ukBillToContact,
				productPurchase: { product: 'GuardianAdLite', ratePlan: 'Monthly' },
			};

		const response = await createSubscriptionWithExistingPaymentMethod(
			zuoraClient,
			productCatalog,
			sourceAccountInput,
			undefined,
		);

		expect(response.accountNumber).toMatch(/^A\d+$/);
		expect(response.subscriptionNumbers.length).toBe(1);

		await deleteAccount(zuoraClient, response.accountNumber);
	}, 120000);

	test('throws for a PayPal payment method', async () => {
		const sourceAccountNumber = 'A00088294';
		const sourceAccountInput: CreateSubscriptionWithExistingPaymentMethodInput =
			{
				...commonFields,
				accountName: '0019E00001JqWrBQAV',
				createdRequestId: `IT-createSubExistingPM-PayPal-${sourceAccountNumber}-${Date.now()}`,
				salesforceAccountId: '0019E00001JqWrBQAV',
				salesforceContactId: '0039E000018HNvRQAW',
				identityId: '100003000',
				currency: 'USD',
				paymentGateway: 'PayPal Express',
				existingPaymentMethod: {
					id: '2c92c0f875d488d70175d6a2a37d0343',
					requiresCloning: true,
				},
				billToContact: {
					firstName: 'TestFirstName',
					lastName: 'TestLastName',
					workEmail: 'test@thegulocal.com',
					country: 'United States',
					state: 'Delaware',
				},
				productPurchase: {
					product: 'DigitalSubscription',
					ratePlan: 'Monthly',
				},
			};

		await expect(
			createSubscriptionWithExistingPaymentMethod(
				zuoraClient,
				productCatalog,
				sourceAccountInput,
				undefined,
			),
		).rejects.toThrow(
			'Unsupported payment method type for cloning: PayPal. Only CreditCardReferenceTransaction and BankTransfer are supported.',
		);
	}, 120000);

	test('creates a SupporterPlus subscription using an existing BankTransfer (GoCardless) payment method', async () => {
		// Account number: A01113215
		const sourceAccountInput: CreateSubscriptionWithExistingPaymentMethodInput =
			{
				...commonFields,
				accountName: '001UD00000Utt18YAB',
				createdRequestId: `IT-createSubExistingPM-BankTransfer-A01113215-${Date.now()}`,
				salesforceAccountId: '001UD00000Utt18YAB',
				salesforceContactId: '003UD000010K3cfYAC',
				identityId: '200663850',
				currency: 'GBP',
				paymentGateway: 'GoCardless',
				existingPaymentMethod: {
					id: '8ad08ef39d670e4a019d6c9a762e1357',
					requiresCloning: true,
				},
				billToContact: ukBillToContact,
				productPurchase: {
					product: 'SupporterPlus',
					ratePlan: 'Monthly',
					amount: 12,
				},
			};

		const response = await createSubscriptionWithExistingPaymentMethod(
			zuoraClient,
			productCatalog,
			sourceAccountInput,
			undefined,
		);

		expect(response.accountNumber).toMatch(/^A\d+$/);
		expect(response.subscriptionNumbers.length).toBe(1);

		await deleteAccount(zuoraClient, response.accountNumber);
	}, 120000);

	test('creates a NationalDelivery EverydayPlus subscription', async () => {
		// Account number: A01113215
		const sourceAccountInput: CreateSubscriptionWithExistingPaymentMethodInput =
			{
				...commonFields,
				accountName: '001UD00000Utt18YAB',
				createdRequestId: `IT-createSubExistingPM-NationalDelivery-A01113215-${Date.now()}`,
				salesforceAccountId: '001UD00000Utt18YAB',
				salesforceContactId: '003UD000010K3cfYAC',
				identityId: '200663850',
				currency: 'GBP',
				paymentGateway: 'GoCardless',
				existingPaymentMethod: {
					id: '8ad08ef39d670e4a019d6c9a762e1357',
					requiresCloning: true,
				},
				billToContact: ukBillToContact,
				productPurchase: {
					product: 'NationalDelivery',
					ratePlan: 'EverydayPlus',
					firstDeliveryDate: dayjs().add(7, 'day').toDate(),
					deliveryContact: {
						firstName: 'TestFirstName',
						lastName: 'TestLastName',
						workEmail: 'test@thegulocal.com',
						country: 'United Kingdom',
						state: undefined,
						city: 'London',
						address1: 'Delivery address',
						address2: '1 Test Street',
						postalCode: 'N1 9GU',
					},
					deliveryInstructions: 'Leave with concierge',
					deliveryAgent: 123,
				},
			};

		const response = await createSubscriptionWithExistingPaymentMethod(
			zuoraClient,
			productCatalog,
			sourceAccountInput,
			undefined,
		);

		expect(response.accountNumber).toMatch(/^A\d+$/);
		expect(response.subscriptionNumbers.length).toBe(1);

		await deleteAccount(zuoraClient, response.accountNumber);
	}, 120000);

	test('applies a promo code to the new subscription', async () => {
		const sourceAccountNumber = 'A00078074';
		const promoCode = 'E2E_TEST_SPLUS_MONTHLY';
		const promotion = await getPromotion(promoCode, 'CODE');

		const sourceAccountInput: CreateSubscriptionWithExistingPaymentMethodInput =
			{
				...commonFields,
				accountName: '0013E00001AU6xcQAD',
				createdRequestId: `IT-createSubExistingPM-promo-${sourceAccountNumber}-${Date.now()}`,
				salesforceAccountId: '0013E00001AU6xcQAD',
				salesforceContactId: '0033E00001Cq8D2QAJ',
				identityId: '9999999',
				currency: 'GBP',
				paymentGateway: 'Stripe Gateway 1' as PaymentGateway<PaymentMethod>,
				existingPaymentMethod: {
					id: '2c92c0f87568d97201756b1578b6069c',
					requiresCloning: true,
				},
				billToContact: ukBillToContact,
				productPurchase: {
					product: 'SupporterPlus',
					ratePlan: 'Monthly',
					amount: 12,
				},
				appliedPromotion: {
					promoCode,
					supportRegionId: SupportRegionId.UK,
				},
			};

		const response = await createSubscriptionWithExistingPaymentMethod(
			zuoraClient,
			productCatalog,
			sourceAccountInput,
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
