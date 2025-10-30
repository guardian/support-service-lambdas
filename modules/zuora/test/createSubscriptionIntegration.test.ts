/**
 * Integration test for the creating a subscription through the Orders api.
 *
 * @group integration
 */

import { SupportRegionId } from '@modules/internationalisation/countryGroup';
import { IsoCurrency } from '@modules/internationalisation/currency';
import { getIfDefined } from '@modules/nullAndUndefined';
import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import { ProductPurchase } from '@modules/product-catalog/productPurchaseSchema';
import { getPromotions } from '@modules/promotions/getPromotions';
import { Promotion } from '@modules/promotions/schema';
import {
	createSubscription,
	CreateSubscriptionInputFields,
} from '@modules/zuora/createSubscription/createSubscription';
import {
	previewCreateSubscription,
	PreviewCreateSubscriptionInputFields,
} from '@modules/zuora/createSubscription/previewCreateSubscription';
import { getInvoice } from '@modules/zuora/invoice';
import {
	CreditCardReferenceTransaction,
	DirectDebit,
	PaymentGateway,
} from '@modules/zuora/orders/paymentMethods';
import { getSubscription } from '@modules/zuora/subscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';
import code from '../../zuora-catalog/test/fixtures/catalog-code.json';

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
	const discountAmount = 25;
	const mockPromotions: Promotion[] = [
		{
			name: 'Test Promotion',
			promotionType: {
				name: 'percent_discount',
				durationMonths: 3,
				amount: discountAmount,
			},
			appliesTo: {
				productRatePlanIds: new Set(['71a116628be96ab11606b51ec6060555']),
				countries: new Set(['GB']),
			},
			codes: { 'Test Channel': ['TEST_CODE'] },
			starts: new Date(dayjs().subtract(1, 'day').toISOString()),
			expires: new Date(dayjs().add(1, 'month').toISOString()),
		},
	];

	test('We can create a subscription with a new account', async () => {
		const client = await ZuoraClient.create('CODE');
		const response = await createSubscription(
			client,
			productCatalog,
			mockPromotions,
			createInputFields,
		);
		expect(response.subscriptionNumbers.length).toEqual(1);
	});

	test('Setting an idempotency key prevents duplicate subscriptions', async () => {
		const idempotencyKey = 'TEST-IDEMPOTENCY-KEY';

		const inputFields: CreateSubscriptionInputFields<DirectDebit> = {
			...createInputFields,
			createdRequestId: idempotencyKey,
		};
		const client = await ZuoraClient.create('CODE');
		const response = await createSubscription(
			client,
			productCatalog,
			mockPromotions,
			inputFields,
		);
		const response2 = await createSubscription(
			client,
			productCatalog,
			mockPromotions,
			inputFields,
		);
		expect(response).toEqual(response2);
	}, 10000);

	test('We can preview a subscription with a new account', async () => {
		const inputFields: PreviewCreateSubscriptionInputFields = {
			stage: 'CODE',
			accountNumber: 'A01036826', // You may need to add a valid account number here because they get deleted after a short time
			currency: currency,
			productPurchase: productPurchase,
		};
		const client = await ZuoraClient.create('CODE');
		const response = await previewCreateSubscription(
			client,
			productCatalog,
			mockPromotions,
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
			productPurchase: fixedTermProductPurchase,
		};
		const client = await ZuoraClient.create('CODE');
		const response = await createSubscription(
			client,
			productCatalog,
			mockPromotions,
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
			mockPromotions,
			inputFields,
		);
		expect(response.subscriptionNumbers.length).toEqual(1);
		const invoiceNumber = getIfDefined(
			response.invoiceNumbers?.[0],
			'Expected an invoice number to be defined',
		);
		const zuoraInvoice = await getInvoice(client, invoiceNumber);
		expect(zuoraInvoice.amount).toEqual(12);
	});
	test('We can create a subscription with a promotion', async () => {
		const promotions = await getPromotions('CODE');
		const productPurchase: ProductPurchase = {
			product: 'SupporterPlus',
			ratePlan: 'Monthly',
			amount: 12,
		};
		const inputFields: CreateSubscriptionInputFields<DirectDebit> = {
			...createInputFields,
			productPurchase: productPurchase,
			appliedPromotion: {
				promoCode: 'E2E_TEST_SPLUS_MONTHLY',
				supportRegionId: SupportRegionId.UK,
			},
		};
		const client = await ZuoraClient.create('CODE');
		const response = await createSubscription(
			client,
			productCatalog,
			promotions,
			inputFields,
		);
		expect(response.subscriptionNumbers.length).toEqual(1);
		const subscription = await getSubscription(
			client,
			getIfDefined(response.subscriptionNumbers[0], 'No subscription number'),
		);
		expect(subscription.ratePlans.length).toEqual(2); // There should be 2 rate plans one for the product and one for the promotion
	}, 10000);
	test('We can preview a subscription with a discount promotion', async () => {
		const inputFields: PreviewCreateSubscriptionInputFields = {
			stage: 'CODE',
			accountNumber: 'A01036826',
			currency: currency,
			productPurchase: productPurchase,
			appliedPromotion: {
				promoCode: 'TEST_CODE',
				supportRegionId: SupportRegionId.UK,
			},
		};
		const client = await ZuoraClient.create('CODE');
		const response = await previewCreateSubscription(
			client,
			productCatalog,
			mockPromotions,
			inputFields,
		);
		console.log(JSON.stringify(response));
		expect(
			response.previewResult.invoices[0]?.invoiceItems.find(
				(item) => item.productName === 'Discounts',
			)?.unitPrice,
		).toEqual(discountAmount);
	});
});
