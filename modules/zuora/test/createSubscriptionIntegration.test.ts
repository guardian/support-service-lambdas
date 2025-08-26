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

	test('We can create a subscription with a new account', async () => {
		const paymentGateway: PaymentGateway<DirectDebit> = 'GoCardless';
		const paymentMethod: DirectDebit = {
			accountHolderInfo: {
				accountHolderName: 'RB',
			},
			accountNumber: '55779911',
			bankCode: '200000',
			type: 'Bacs',
		};

		const inputFields: CreateSubscriptionInputFields<DirectDebit> = {
			accountName: 'Test Account',
			createdRequestId: 'REQUEST-ID',
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
		const client = await ZuoraClient.create('CODE');
		const response = await createSubscription(
			client,
			productCatalog,
			inputFields,
		);
		console.log(JSON.stringify(response));
	});

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
	});
});
