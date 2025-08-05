/**
 * Integration test for the creating a subscription through the Orders api.
 *
 * @group integration
 */

import { Currency } from '@modules/internationalisation/currency';
import {
	buildNewAccountObject,
	DirectDebit,
	PaymentGateway,
} from '@modules/zuora/orders/newAccount';
import { buildCreateSubscriptionOrderAction } from '@modules/zuora/orders/orderActions';
import dayjs from 'dayjs';
import { OrderRequest } from '@modules/zuora/orders/orders';
import { zuoraDateFormat } from '@modules/zuora/utils';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { createSubscription } from '@modules/zuora/createSubscription';

test('We can create a subscription with a new account', async () => {
	const currency: Currency = 'GBP';
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
	const crmId = 'CRM-ID';
	const newAccount = buildNewAccountObject({
		createdRequestId: 'REQUEST-ID',
		salesforceAccountId: crmId,
		salesforceContactId: 'SF-CONTACT-ID',
		identityId: 'IDENTITY-ID',
		currency: currency,
		paymentGateway: paymentGateway,
		paymentMethod: paymentMethod,
		billToContact: contact,
	});

	const createSubscriptionOrderAction = buildCreateSubscriptionOrderAction({
		productRatePlanId: '2c92c0f85a6b134e015a7fcd9f0c7855',
		contractEffectiveDate: dayjs(),
		chargeOverride: {
			productRatePlanChargeId: '2c92c0f85a6b1352015a7fcf35ab397c',
			overrideAmount: 8.99,
		},
	});

	const request: OrderRequest = {
		newAccount: newAccount,
		orderDate: zuoraDateFormat(dayjs()),
		subscriptions: [
			{
				orderActions: [createSubscriptionOrderAction],
			},
		],
	};

	const client = await ZuoraClient.create('CODE');
	const response = await createSubscription(client, request);
	console.log(JSON.stringify(response));
});
