/**
 * Integration test for the creating a subscription through the Orders api.
 *
 * @group integration
 */

import { IsoCurrency } from '@modules/internationalisation/currency';
import dayjs from 'dayjs';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import {
	createSubscription,
	CreateSubscriptionInputFields,
} from '@modules/zuora/createSubscription/createSubscription';
import {
	CreditCardReferenceTransaction,
	DirectDebit,
	PaymentGateway,
} from '@modules/zuora/orders/paymentMethods';
import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import code from '../../zuora-catalog/test/fixtures/catalog-code.json';
import {
	previewCreateSubscription,
	PreviewCreateSubscriptionInputFields,
} from '@modules/zuora/createSubscription/previewCreateSubscription';
import { ProductPurchase } from '@modules/product-catalog/productPurchaseSchema';

describe('createSubscription integration', () => {
	const productCatalog = generateProductCatalog(code);
	const currency: IsoCurrency = 'GBP';
	const contact = {
		firstName: 'John',
		lastName: 'Doe',
		workEmail: 'test@thegulocal.com',
		country: 'GB',
		state: '',
		city: 'London',
		address1: 'Kings Place',
		postalCode: 'N1 9GU',
	};
	const productPurchase: ProductPurchase = {
		product: 'NationalDelivery',
		ratePlan: 'EverydayPlus',
		firstDeliveryDate: dayjs().add(1, 'month').toDate(),
		deliveryContact: contact,
		deliveryInstructions: 'Leave at front door',
		deliveryAgent: 123,
	};
	const paymentGateway: PaymentGateway<DirectDebit> = 'GoCardless';
	const paymentMethod: DirectDebit = {
		accountHolderInfo: {
			accountHolderName: 'RB',
		},
		accountNumber: '55779911',
		bankCode: '200000',
		type: 'Bacs',
	};
	const createInputFields: CreateSubscriptionInputFields<DirectDebit> = {
		accountName: 'Test Account',
		createdRequestId: 'REQUEST-ID' + new Date().getTime(),
		salesforceAccountId: 'CRM-ID',
		salesforceContactId: 'SF-CONTACT-ID',
		identityId: 'IDENTITY-ID',
		currency: currency,
		paymentGateway: paymentGateway,
		paymentMethod: paymentMethod,
		billToContact: contact,
		productPurchase: productPurchase,
		runBilling: true,
		collectPayment: true,
	};

	test('We can create a subscription with a new account', async () => {
		const client = await ZuoraClient.create('CODE');
		const response = await createSubscription(
			client,
			productCatalog,
			createInputFields,
		);
		expect(response.subscriptionNumbers.length).toEqual(1);
	});

	test('Setting an idempotency key prevents duplicate subscriptions', async () => {
		const idempotencyKey = 'TEST-IDEMPOTENCY-KEY-' + new Date().getTime();

		const inputFields: CreateSubscriptionInputFields<DirectDebit> = {
			...createInputFields,
			createdRequestId: idempotencyKey,
		};
		const client = await ZuoraClient.create('CODE');
		const response = await createSubscription(
			client,
			productCatalog,
			inputFields,
		);
		const response2 = await createSubscription(
			client,
			productCatalog,
			inputFields,
		);
		expect(response).toEqual(response2);
	}, 10000);

	test('We can preview a subscription with a new account', async () => {
		const inputFields: PreviewCreateSubscriptionInputFields = {
			accountNumber: 'A01036826', // You will probably need to add a valid account number here because they get deleted after a short time
			currency: currency,
			productPurchase: productPurchase,
		};
		const client = await ZuoraClient.create('CODE');
		const response = await previewCreateSubscription(
			client,
			productCatalog,
			inputFields,
		);
		console.log(JSON.stringify(response));
		expect(response.previewResult.invoices.length).toBeGreaterThan(0);
	});

	test('We can create a fixed term subscription', async () => {
		const fixedTermProductPurchase: ProductPurchase = {
			product: 'SupporterPlus',
			ratePlan: 'OneYearStudent',
			amount: 9,
		};
		const inputFields: CreateSubscriptionInputFields<DirectDebit> = {
			...createInputFields,
			createdRequestId: 'TEST-IDEMPOTENCY-KEY-' + new Date().getTime(), // We don't want to reuse the same idempotency key
			productPurchase: fixedTermProductPurchase,
		};
		const client = await ZuoraClient.create('CODE');
		const response = await createSubscription(
			client,
			productCatalog,
			inputFields,
		);
		expect(response.subscriptionNumbers.length).toEqual(1);
	});

	test('We can create a subscription with a credit card', async () => {
		// Test with supporter plus so we can check if invoices are generated correctly
		const productPurchase: ProductPurchase = {
			product: 'SupporterPlus',
			ratePlan: 'Monthly',
			amount: 12,
		};
		const creditCardFields: CreditCardReferenceTransaction = {
			type: 'CreditCardReferenceTransaction',
			tokenId: 'card_E0zitFfsO2wTEn',
			secondTokenId: 'cus_E0zic0cedDT5MZ',
			cardNumber: '4242',
			cardType: 'Visa',
			expirationMonth: 12,
			expirationYear: 2025,
		};
		const inputFields: CreateSubscriptionInputFields<CreditCardReferenceTransaction> =
			{
				...createInputFields,
				productPurchase: productPurchase,
				paymentMethod: creditCardFields,
				paymentGateway: 'Stripe PaymentIntents GNM Membership',
			};
		const client = await ZuoraClient.create('CODE');
		const response = await createSubscription(
			client,
			productCatalog,
			inputFields,
		);
		expect(response.subscriptionNumbers.length).toEqual(1);
	});
});
