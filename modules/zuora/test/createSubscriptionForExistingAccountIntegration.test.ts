/**
 * Integration tests for createSubscriptionForExistingAccount against the CODE Zuora environment.
 *
 * @group integration
 */

import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import type { ProductPurchase } from '@modules/product-catalog/productPurchaseSchema';
import { zuoraCatalogSchema } from '@modules/zuora-catalog/zuoraCatalogSchema';
import type { CreateSubscriptionInputFields } from '@modules/zuora/createSubscription/createSubscription';
import { createSubscription } from '@modules/zuora/createSubscription/createSubscription';
import { createSubscriptionForExistingAccount } from '@modules/zuora/createSubscription/createSubscriptionForExistingAccount';
import type {
	DirectDebit,
	PaymentGateway,
} from '@modules/zuora/orders/paymentMethods';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import code from '../../zuora-catalog/test/fixtures/catalog-code.json';

describe('createSubscriptionForExistingAccount integration', () => {
	const productCatalog = generateProductCatalog(zuoraCatalogSchema.parse(code));
	const currency = 'GBP' as const;

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

	const paymentGateway: PaymentGateway<DirectDebit> = 'GoCardless';
	const paymentMethod: DirectDebit = {
		accountHolderInfo: { accountHolderName: 'Test User' },
		accountNumber: '55779911',
		bankCode: '200000',
		type: 'Bacs',
	};

	test('creates a new subscription on an existing account', async () => {
		const client = await ZuoraClient.create('CODE');
		const requestId = `IT-createSubscriptionForExistingAccount-${Date.now()}`;

		// First, create a new account with an initial GuardianAdLite subscription
		const initialProductPurchase: ProductPurchase = {
			product: 'GuardianAdLite',
			ratePlan: 'Monthly',
		};
		const createInputFields: CreateSubscriptionInputFields<DirectDebit> = {
			accountName: 'IT createSubscriptionForExistingAccount',
			createdRequestId: requestId,
			salesforceAccountId: 'CRM-ID',
			salesforceContactId: 'SF-CONTACT-ID',
			identityId: 'IDENTITY-ID',
			currency,
			paymentGateway,
			paymentMethod,
			billToContact: contact,
			productPurchase: initialProductPurchase,
			runBilling: false,
			collectPayment: false,
		};
		const initialResponse = await createSubscription(
			client,
			productCatalog,
			createInputFields,
			undefined,
		);
		expect(initialResponse.accountNumber).toBeDefined();

		// Now add a second subscription to the same account
		const secondProductPurchase: ProductPurchase = {
			product: 'GuardianAdLite',
			ratePlan: 'Monthly',
		};

		const response = await createSubscriptionForExistingAccount(
			client,
			productCatalog,
			{
				accountNumber: initialResponse.accountNumber,
				productPurchase: secondProductPurchase,
				createdRequestId: `${requestId}-second`,
				runBilling: false,
				collectPayment: false,
			},
			undefined,
		);

		console.log(JSON.stringify(response));
		expect(response.accountNumber).toBe(initialResponse.accountNumber);
		expect(response.subscriptionNumbers.length).toBe(1);
	}, 120000);
});
