/**
 * Integration test for the creating a subscription through the Orders api.
 *
 * @group integration
 */

import { IsoCurrency } from '@modules/internationalisation/currency';
import dayjs from 'dayjs';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { createSubscription } from '@modules/zuora/createSubscription/createSubscription';
import {
	DirectDebit,
	PaymentGateway,
} from '@modules/zuora/orders/paymentMethods';

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

	const inputFields = {
		accountName: 'Test Account',
		createdRequestId: 'REQUEST-ID',
		salesforceAccountId: 'CRM-ID',
		salesforceContactId: 'SF-CONTACT-ID',
		identityId: 'IDENTITY-ID',
		currency: currency,
		paymentGateway: paymentGateway,
		paymentMethod: paymentMethod,
		billToContact: contact,
		productRatePlanId: '2c92c0f85a6b134e015a7fcd9f0c7855',
		contractEffectiveDate: dayjs(),
		customerAcceptanceDate: dayjs(),
		chargeOverride: {
			productRatePlanChargeId: '2c92c0f85a6b1352015a7fcf35ab397c',
			overrideAmount: 8.99,
		},
		runBilling: true,
		collectPayment: true,
	};
	const client = await ZuoraClient.create('CODE');
	const response = await createSubscription(client, inputFields);
	console.log(JSON.stringify(response));
});
