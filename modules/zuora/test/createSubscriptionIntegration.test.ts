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

test('We can create a subscription with a new account', async () => {
	const currency: IsoCurrency = 'GBP';
	const paymentGateway: PaymentGateway<DirectDebit> = 'GoCardless';
	const paymentMethod: DirectDebit = {
		accountHolderInfo: {
			accountHolderName: 'RB',
		},
		accountNumber: '55779911',
		bankCode: '200000',
		type: 'Bacs',
	};
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
		productPurchase: {
			product: 'NationalDelivery',
			ratePlan: 'EverydayPlus',
			firstDeliveryDate: dayjs().add(1, 'month').toDate(),
			deliveryContact: contact,
			deliveryInstructions: 'Leave at front door',
			deliveryAgent: 123,
		},
		runBilling: true,
		collectPayment: true,
	};
	const client = await ZuoraClient.create('CODE');
	const productCatalog = generateProductCatalog(code);
	const response = await createSubscription(
		client,
		productCatalog,
		inputFields,
	);
	console.log(JSON.stringify(response));
});
